import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getPlanByUserAndDate, getPlanItemsWithTasks, createPlan, getRecentCompletions } from '@/lib/db/plans';
import { getTasksByUserId } from '@/lib/db/tasks';
import { getPillarsByUserId } from '@/lib/db/pillars';
import { getRecentReviews } from '@/lib/db/reviews';
import { getUserById } from '@/lib/db/users';
import { generateDailyPlan } from '@/lib/plan-generator';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const today = new Date().toISOString().split('T')[0];

    // Check for existing plan
    let plan = await getPlanByUserAndDate(userId, today);

    // Generate if none exists
    if (!plan) {
      plan = await generateAndSavePlan(userId, today);
    }

    if (!plan) {
      return NextResponse.json({ data: { plan: null, items: [] } });
    }

    const items = await getPlanItemsWithTasks(plan.id);
    return NextResponse.json({ data: { plan, items } });
  } catch (e) {
    console.error('GET /api/plans/today error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

async function generateAndSavePlan(userId: string, date: string) {
  const user = await getUserById(userId);
  if (!user) return null;

  const [tasks, pillarRows, recentReviews, recentCompletions] = await Promise.all([
    getTasksByUserId(userId),
    getPillarsByUserId(userId),
    getRecentReviews(userId),
    getRecentCompletions(userId),
  ]);

  const pillars = pillarRows.map((p) => ({
    ...p,
    // Strip extra fields from PillarWithCounts to match Pillar type
  }));

  const generated = generateDailyPlan({
    user,
    date: new Date(date + 'T00:00:00'),
    tasks,
    pillars,
    recentReviews,
    recentCompletions,
  });

  if (generated.items.length === 0) return null;

  return createPlan({
    userId,
    date,
    dayType: generated.dayType,
    availableMinutes: generated.availableMinutes,
    items: generated.items,
  });
}
