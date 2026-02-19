import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getDefaultUser } from '@/lib/db/users';
import { generateAndSavePlan } from '@/lib/db/plan-operations';

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
      { status: 401 }
    );
  }

  try {
    const user = await getDefaultUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No user found' } },
        { status: 404 }
      );
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const plan = await generateAndSavePlan(user, dateStr);

    return NextResponse.json({
      data: {
        date: dateStr,
        planId: plan?.id ?? null,
        itemCount: plan ? 1 : 0,
      },
    });
  } catch (e) {
    console.error('Cron plan generation error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Plan generation failed' } },
      { status: 500 }
    );
  }
}
