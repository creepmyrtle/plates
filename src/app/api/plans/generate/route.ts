import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { createPlan, getPlanItemsWithTasks, getRecentCompletions } from '@/lib/db/plans';
import { getTasksByUserId } from '@/lib/db/tasks';
import { getPillarsByUserId } from '@/lib/db/pillars';
import { getRecentReviews } from '@/lib/db/reviews';
import { getUserById } from '@/lib/db/users';
import { generateDailyPlan } from '@/lib/plan-generator';

export async function POST() {
  try {
    const userId = await getSessionUserId();
    const today = new Date().toISOString().split('T')[0];

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const [tasks, pillarRows, recentReviews, recentCompletions] = await Promise.all([
      getTasksByUserId(userId),
      getPillarsByUserId(userId),
      getRecentReviews(userId),
      getRecentCompletions(userId),
    ]);

    const generated = generateDailyPlan({
      user,
      date: new Date(today + 'T00:00:00'),
      tasks,
      pillars: pillarRows,
      recentReviews,
      recentCompletions,
    });

    const plan = await createPlan({
      userId,
      date: today,
      dayType: generated.dayType,
      availableMinutes: generated.availableMinutes,
      items: generated.items,
    });

    const items = await getPlanItemsWithTasks(plan.id);
    return NextResponse.json({ data: { plan, items } });
  } catch (e) {
    console.error('POST /api/plans/generate error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
