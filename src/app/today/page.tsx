import { getSessionUserId } from '@/lib/auth';
import { getPlanByUserAndDate, getPlanItemsWithTasks } from '@/lib/db/plans';
import TodayView from './TodayView';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];

  const plan = await getPlanByUserAndDate(userId, today);
  const items = plan ? await getPlanItemsWithTasks(plan.id) : [];

  return <TodayView initialPlan={plan} initialItems={items} date={today} />;
}
