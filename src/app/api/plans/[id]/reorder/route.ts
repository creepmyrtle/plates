import { NextResponse } from 'next/server';
import { reorderPlanItems } from '@/lib/db/plans';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { itemIds } = await request.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'itemIds array is required' } },
        { status: 400 }
      );
    }

    await reorderPlanItems(id, itemIds);
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
