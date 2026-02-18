import { redirect } from 'next/navigation';
import { getDefaultUser } from '@/lib/db/users';
import { seedDatabase } from '@/lib/db/seed';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await seedDatabase();
  const user = await getDefaultUser();

  if (!user || !user.onboarded) {
    redirect('/onboarding');
  }

  redirect('/today');
}
