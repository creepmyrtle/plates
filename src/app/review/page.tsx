import { getSessionUserId } from '@/lib/auth';
import { getPillarsByUserId } from '@/lib/db/pillars';
import { getPlanByUserAndDate, getPlanItemsWithTasks } from '@/lib/db/plans';
import { getReviewWithRatings } from '@/lib/db/reviews';
import ReviewFlow from '@/components/ReviewFlow';
import ReviewSummary from './ReviewSummary';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];

  // Check if review already exists
  const existingReview = await getReviewWithRatings(userId, today);

  if (existingReview) {
    const pillarRows = await getPillarsByUserId(userId);
    return <ReviewSummary review={existingReview.review} ratings={existingReview.ratings} pillars={pillarRows} />;
  }

  // Get data for the review flow
  const [pillarRows, plan] = await Promise.all([
    getPillarsByUserId(userId),
    getPlanByUserAndDate(userId, today),
  ]);

  const pillars = pillarRows.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    color: p.color,
    type: p.type as 'ongoing' | 'goal',
    status: p.status as 'active' | 'completed' | 'archived',
    sort_order: p.sort_order,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  // Get incomplete plan items
  let incompleteItems: Awaited<ReturnType<typeof getPlanItemsWithTasks>> = [];
  if (plan) {
    const allItems = await getPlanItemsWithTasks(plan.id);
    incompleteItems = allItems.filter((i) => !i.completed && !i.skipped);
  }

  return <ReviewFlow pillars={pillars} incompleteItems={incompleteItems} />;
}
