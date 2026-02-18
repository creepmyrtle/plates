import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { markOnboarded } from '@/lib/db/users';

export async function POST() {
  try {
    const userId = await getSessionUserId();
    const user = await markOnboarded(userId);
    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
