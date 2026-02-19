import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getPlanItemsWithTasks } from '@/lib/db/plans';
import { generatePlanForUser } from '@/lib/db/plan-operations';

export async function POST() {
  try {
    const userId = await getSessionUserId();
    const today = new Date().toISOString().split('T')[0];

    const plan = await generatePlanForUser(userId, today);

    if (!plan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Could not generate plan' } },
        { status: 404 }
      );
    }

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
