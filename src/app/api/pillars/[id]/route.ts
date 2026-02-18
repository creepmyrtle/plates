import { NextResponse } from 'next/server';
import { getPillarById, updatePillar, archivePillar } from '@/lib/db/pillars';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const pillar = await updatePillar(id, {
      name: body.name,
      color: body.color,
      type: body.type,
      description: body.description,
      icon: body.icon,
      status: body.status,
    });

    if (!pillar) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Pillar not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: pillar });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await getPillarById(id);
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Pillar not found' } },
        { status: 404 }
      );
    }

    const pillar = await archivePillar(id);
    return NextResponse.json({ data: pillar });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
