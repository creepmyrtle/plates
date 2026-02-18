import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
      { status: 401 }
    );
  }

  // TODO: Implement plan generation in Phase 4
  return NextResponse.json({
    data: { message: 'Plan generation not yet implemented' },
  });
}
