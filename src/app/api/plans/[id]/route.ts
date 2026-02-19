import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getPlanByUserAndDate, getPlanById, getPlanItemsWithTasks } from '@/lib/db/plans';

/**
 * Handles both plan ID lookups and date-based lookups (YYYY-MM-DD).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();

    // Detect if the param is a date (YYYY-MM-DD) or a plan ID
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(id);

    let plan;
    if (isDate) {
      plan = await getPlanByUserAndDate(userId, id);
    } else {
      plan = await getPlanById(id);
    }

    if (!plan) {
      return NextResponse.json({ data: { plan: null, items: [] } });
    }

    const items = await getPlanItemsWithTasks(plan.id);
    return NextResponse.json({ data: { plan, items } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
