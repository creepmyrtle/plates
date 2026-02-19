import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { createReview } from '@/lib/db/reviews';

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = await request.json();

    if (!body.mood || !body.plateRatings) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'mood and plateRatings are required' } },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const review = await createReview({
      userId,
      date: body.date || today,
      mood: body.mood,
      notes: body.notes,
      plateRatings: body.plateRatings,
    });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
