import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getReviewWithRatings } from '@/lib/db/reviews';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const today = new Date().toISOString().split('T')[0];

    const result = await getReviewWithRatings(userId, today);
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
