import { getDb } from './index';
import { createUser, getDefaultUser } from './users';

const DEFAULT_USER_ID = 'default-user';
const DEFAULT_USERNAME = 'plates';
const DEFAULT_NAME = 'Plates User';

export async function seedDatabase(): Promise<void> {
  await getDb();

  const existing = await getDefaultUser();
  if (existing) return;

  await createUser(DEFAULT_USER_ID, DEFAULT_USERNAME, DEFAULT_NAME);
  console.log(`Seeded default user: ${DEFAULT_USERNAME}`);
}
