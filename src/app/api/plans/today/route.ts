import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getPlanByUserAndDate, getPlanItemsWithTasks } from '@/lib/db/plans';
import { generatePlanForUser } from '@/lib/db/plan-operations';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const today = new Date().toISOString().split('T')[0];

    // Check for existing plan
    let plan = await getPlanByUserAndDate(userId, today);

    // Generate if none exists
    if (!plan) {
      plan = await generatePlanForUser(userId, today);
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
