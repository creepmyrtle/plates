import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db/users';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = await request.json();

    const allowedFields = [
      'name', 'wake_time', 'sleep_time', 'work_start_time',
      'work_end_time', 'work_days', 'timezone', 'review_time',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const user = await updateUser(userId, updates);
    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
