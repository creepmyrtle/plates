import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getTasksByUserId, createTask } from '@/lib/db/tasks';

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    const { searchParams } = new URL(request.url);

    const tasks = await getTasksByUserId(userId, {
      pillarId: searchParams.get('pillarId') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      context: searchParams.get('context') || undefined,
    });

    return NextResponse.json({ data: tasks });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.pillar_id || !body.title) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'pillar_id and title are required' } },
        { status: 400 }
      );
    }

    const task = await createTask({
      pillar_id: body.pillar_id,
      title: body.title,
      description: body.description,
      priority: body.priority,
      effort_minutes: body.effort_minutes,
      energy_level: body.energy_level,
      context: body.context,
      time_preference: body.time_preference,
      due_date: body.due_date,
      is_recurring: body.is_recurring,
      recurrence_rule: body.recurrence_rule,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
