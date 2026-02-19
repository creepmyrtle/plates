import { NextResponse } from 'next/server';
import { skipPlanItem } from '@/lib/db/plans';
import { skipTask } from '@/lib/db/tasks';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const item = await skipPlanItem(itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plan item not found' } },
        { status: 404 }
      );
    }

    // Also skip the underlying task (advances recurring)
    const task = await skipTask(item.task_id);

    return NextResponse.json({ data: { item, task } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
