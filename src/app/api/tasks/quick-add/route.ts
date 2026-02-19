import { NextResponse } from 'next/server';
import { createTask } from '@/lib/db/tasks';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.plate_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'title and plate_id are required' } },
        { status: 400 }
      );
    }

    const task = await createTask({
      plate_id: body.plate_id,
      title: body.title,
      priority: body.priority || 'medium',
      due_date: body.due_date,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
