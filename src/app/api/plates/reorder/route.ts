import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { reorderPlates } from '@/lib/db/plates';

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'ids array is required' } },
        { status: 400 }
      );
    }

    await reorderPlates(userId, ids);
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
