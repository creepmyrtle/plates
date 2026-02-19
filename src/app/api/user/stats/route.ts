import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionUserId } from '@/lib/auth';
import { getPillarsByUserId } from '@/lib/db/pillars';
import { getRecentCompletions } from '@/lib/db/plans';
import { getReviewStreak } from '@/lib/db/reviews';
import { calculatePillarHealth } from '@/lib/pillar-health';
import { getDb } from '@/lib/db/index';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    await getDb();

    const [pillars, recentCompletions, reviewStreak] = await Promise.all([
      getPillarsByUserId(userId),
      getRecentCompletions(userId, 7),
      getReviewStreak(userId),
    ]);

    // Completion stats for last 7 days
    const { rows: weeklyStats } = await sql`
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_this_week,
        COUNT(*)::int AS total_tasks
      FROM tasks t
      JOIN pillars p ON t.pillar_id = p.id
      WHERE p.user_id = ${userId}
    `;

    // Today's plan completion rate
    const today = new Date().toISOString().split('T')[0];
    const { rows: todayStats } = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE pi.completed)::int AS completed,
        COUNT(*) FILTER (WHERE pi.skipped)::int AS skipped
      FROM plan_items pi
      JOIN daily_plans dp ON pi.daily_plan_id = dp.id
      WHERE dp.user_id = ${userId} AND dp.date = ${today}
    `;

    // Overdue tasks
    const { rows: overdueRows } = await sql`
      SELECT COUNT(*)::int AS count FROM tasks t
      JOIN pillars p ON t.pillar_id = p.id
      WHERE p.user_id = ${userId}
        AND t.status != 'completed'
        AND t.due_date < ${today}
    `;

    // Upcoming deadlines (next 7 days)
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const sevenDaysStr = sevenDaysOut.toISOString().split('T')[0];

    const { rows: upcomingRows } = await sql`
      SELECT t.id, t.title, t.due_date, t.priority, p.name AS pillar_name, p.color AS pillar_color
      FROM tasks t
      JOIN pillars p ON t.pillar_id = p.id
      WHERE p.user_id = ${userId}
        AND t.status != 'completed'
        AND t.due_date >= ${today}
        AND t.due_date <= ${sevenDaysStr}
      ORDER BY t.due_date ASC
      LIMIT 10
    `;

    // Pillar health scores
    const pillarHealth = pillars.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      health: calculatePillarHealth(
        p.id,
        [], // No per-pillar review ratings in this simplified query
        recentCompletions
      ),
    }));

    // Completion rate (last 7 days from plan items)
    const { rows: weeklyPlanStats } = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE pi.completed)::int AS completed
      FROM plan_items pi
      JOIN daily_plans dp ON pi.daily_plan_id = dp.id
      WHERE dp.user_id = ${userId}
        AND dp.date >= (CURRENT_DATE - INTERVAL '7 days')
    `;

    const weeklyCompletionRate = weeklyPlanStats[0]?.total > 0
      ? Math.round((weeklyPlanStats[0].completed / weeklyPlanStats[0].total) * 100)
      : 0;

    return NextResponse.json({
      data: {
        reviewStreak,
        weeklyCompletionRate,
        completedThisWeek: weeklyStats[0]?.completed_this_week ?? 0,
        totalTasks: weeklyStats[0]?.total_tasks ?? 0,
        todayPlan: {
          total: todayStats[0]?.total ?? 0,
          completed: todayStats[0]?.completed ?? 0,
          skipped: todayStats[0]?.skipped ?? 0,
        },
        overdueCount: overdueRows[0]?.count ?? 0,
        upcomingDeadlines: upcomingRows,
        pillarHealth,
      },
    });
  } catch (e) {
    console.error('GET /api/user/stats error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
