import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local since we're running outside Next.js
const envPath = resolve(__dirname, '..', '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error('Could not read .env.local — make sure it exists at the project root.');
  process.exit(1);
}

import { sql } from '@vercel/postgres';

async function migrate() {
  // Note: we intentionally skip getDb()/ensureSchema() here because the
  // schema expects the new column names which don't exist yet.

  console.log('Migrating pillars → plates...\n');

  // Check if old "pillars" table exists
  const { rows: oldTable } = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'pillars'
    ) AS exists
  `;

  if (!oldTable[0]?.exists) {
    console.log('No "pillars" table found — nothing to migrate.');
    console.log('If this is a fresh database, just start the app and the schema will auto-initialize.');
    process.exit(0);
  }

  // Check if new "plates" table already exists
  const { rows: newTable } = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'plates'
    ) AS exists
  `;

  if (newTable[0]?.exists) {
    // ensureSchema() likely auto-created an empty "plates" table.
    // Check if it's empty — if so, drop it and proceed with the rename.
    const { rows: plateCount } = await sql`SELECT COUNT(*) AS count FROM plates`;
    const { rows: pillarCount } = await sql`SELECT COUNT(*) AS count FROM pillars`;

    if (Number(plateCount[0]?.count) === 0 && Number(pillarCount[0]?.count) > 0) {
      console.log('  Found empty "plates" table (auto-created by schema). Dropping it...');
      // Drop dependent objects that reference the empty plates table first
      await sql`DROP TABLE IF EXISTS plate_review_ratings CASCADE`;
      await sql`DROP TABLE IF EXISTS plates CASCADE`;
    } else if (Number(plateCount[0]?.count) > 0) {
      console.log('Both "pillars" and "plates" tables have data. Aborting to avoid data loss.');
      console.log('Resolve this manually.');
      process.exit(1);
    } else {
      console.log('Both tables are empty — dropping "pillars" and keeping "plates".');
      await sql`DROP TABLE IF EXISTS pillar_review_ratings CASCADE`;
      await sql`DROP TABLE IF EXISTS pillars CASCADE`;
      console.log('\nCleanup complete.');
      process.exit(0);
    }
  }

  // Rename tables
  console.log('  Renaming table: pillars → plates');
  await sql`ALTER TABLE pillars RENAME TO plates`;

  // Check if pillar_review_ratings exists before renaming
  const { rows: ratingsTable } = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'pillar_review_ratings'
    ) AS exists
  `;

  if (ratingsTable[0]?.exists) {
    console.log('  Renaming table: pillar_review_ratings → plate_review_ratings');
    await sql`ALTER TABLE pillar_review_ratings RENAME TO plate_review_ratings`;
  }

  // Rename columns: pillar_id → plate_id
  console.log('  Renaming column: milestones.pillar_id → plate_id');
  await sql`ALTER TABLE milestones RENAME COLUMN pillar_id TO plate_id`;

  console.log('  Renaming column: tasks.pillar_id → plate_id');
  await sql`ALTER TABLE tasks RENAME COLUMN pillar_id TO plate_id`;

  if (ratingsTable[0]?.exists) {
    console.log('  Renaming column: plate_review_ratings.pillar_id → plate_id');
    await sql`ALTER TABLE plate_review_ratings RENAME COLUMN pillar_id TO plate_id`;
  }

  // Rename indexes
  console.log('  Renaming indexes...');
  await safeRename('idx_pillars_user_status', 'idx_plates_user_status');
  await safeRename('idx_milestones_pillar', 'idx_milestones_plate');

  console.log('\nMigration complete! Your data has been preserved.');
}

async function safeRename(oldName: string, newName: string) {
  try {
    await sql.query(`ALTER INDEX IF EXISTS ${oldName} RENAME TO ${newName}`);
    console.log(`    ${oldName} → ${newName}`);
  } catch {
    // Index may not exist, skip silently
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
