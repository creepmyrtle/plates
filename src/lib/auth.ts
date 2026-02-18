import { getDefaultUser } from '@/lib/db/users';
import { seedDatabase } from '@/lib/db/seed';

/**
 * Minimal auth for v1 — single-user, no login required.
 * Returns the default user ID after ensuring the DB is seeded.
 * Designed to be swapped for real session auth later.
 */
export async function getSessionUserId(): Promise<string> {
  await seedDatabase();
  const user = await getDefaultUser();
  if (!user) throw new Error('No default user found after seeding');
  return user.id;
}

/**
 * Verify cron secret for protected endpoints.
 */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
