import { seedDatabase } from '@/lib/db/seed';

async function main() {
  console.log('Seeding database...');
  await seedDatabase();
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
