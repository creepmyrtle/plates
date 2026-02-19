import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/db/tasks';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const task = await updateTask(id, {
      title: body.title,
      description: body.description,
      priority: body.priority,
      effort_minutes: body.effort_minutes,
      energy_level: body.energy_level,
      context: body.context,
      time_preference: body.time_preference,
      due_date: body.due_date,
      status: body.status,
      is_recurring: body.is_recurring,
      recurrence_rule: body.recurrence_rule,
    });

    if (!task) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: task });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await getTaskById(id);
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    await deleteTask(id);
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
