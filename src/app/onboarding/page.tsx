import { redirect } from 'next/navigation';
import { getDefaultUser } from '@/lib/db/users';
import { seedDatabase } from '@/lib/db/seed';
import OnboardingWizard from '@/components/OnboardingWizard';

export default async function OnboardingPage() {
  await seedDatabase();
  const user = await getDefaultUser();

  // If already onboarded, redirect to today
  if (user?.onboarded) {
    redirect('/today');
  }

  return <OnboardingWizard />;
}
