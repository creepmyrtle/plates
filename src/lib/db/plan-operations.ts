import { getUserById } from './users';
import { getTasksByUserId } from './tasks';
import { getPlatesByUserId } from './plates';
import { getRecentReviews } from './reviews';
import { createPlan, getRecentCompletions } from './plans';
import { generateDailyPlan } from '../plan-generator';
import type { DailyPlan, User } from '../types';

/**
 * Shared logic: fetch all inputs, run the plan generator, and persist the result.
 * Used by /api/plans/today, /api/plans/generate, and /api/cron/generate-plan.
 */
export async function generateAndSavePlan(
  user: User,
  date: string,
): Promise<DailyPlan | null> {
  const [tasks, plates, recentReviews, recentCompletions] = await Promise.all([
    getTasksByUserId(user.id),
    getPlatesByUserId(user.id),
    getRecentReviews(user.id),
    getRecentCompletions(user.id),
  ]);

  const generated = generateDailyPlan({
    user,
    date: new Date(date + 'T00:00:00'),
    tasks,
    plates,
    recentReviews,
    recentCompletions,
  });

  if (generated.items.length === 0) return null;

  return createPlan({
    userId: user.id,
    date,
    dayType: generated.dayType,
    availableMinutes: generated.availableMinutes,
    items: generated.items,
  });
}

/**
 * Convenience: fetch user by ID then generate plan.
 * Returns null if user not found or no tasks to plan.
 */
export async function generatePlanForUser(
  userId: string,
  date: string,
): Promise<DailyPlan | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  return generateAndSavePlan(user, date);
}
