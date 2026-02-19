import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getDefaultUser } from '@/lib/db/users';
import { getTasksByUserId } from '@/lib/db/tasks';
import { getPillarsByUserId } from '@/lib/db/pillars';
import { getRecentReviews } from '@/lib/db/reviews';
import { createPlan, getRecentCompletions } from '@/lib/db/plans';
import { generateDailyPlan } from '@/lib/plan-generator';

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
      { status: 401 }
    );
  }

  try {
    // For v1, generate for the single default user
    const user = await getDefaultUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No user found' } },
        { status: 404 }
      );
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const [tasks, pillars, recentReviews, recentCompletions] = await Promise.all([
      getTasksByUserId(user.id),
      getPillarsByUserId(user.id),
      getRecentReviews(user.id),
      getRecentCompletions(user.id),
    ]);

    const generated = generateDailyPlan({
      user,
      date: tomorrow,
      tasks,
      pillars,
      recentReviews,
      recentCompletions,
    });

    const plan = await createPlan({
      userId: user.id,
      date: dateStr,
      dayType: generated.dayType,
      availableMinutes: generated.availableMinutes,
      items: generated.items,
    });

    return NextResponse.json({
      data: {
        date: dateStr,
        planId: plan.id,
        itemCount: generated.items.length,
      },
    });
  } catch (e) {
    console.error('Cron plan generation error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Plan generation failed' } },
      { status: 500 }
    );
  }
}
