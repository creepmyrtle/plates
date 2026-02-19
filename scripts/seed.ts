import { seedSampleData } from '@/lib/db/seed';

async function main() {
  console.log('Seeding database with sample data...');
  await seedSampleData();
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
