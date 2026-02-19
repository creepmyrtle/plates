import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getReviewHistory } from '@/lib/db/reviews';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const history = await getReviewHistory(userId, 30);
    return NextResponse.json({ data: history });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
