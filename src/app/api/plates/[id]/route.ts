import { NextResponse } from 'next/server';
import { getPlateById, updatePlate, archivePlate } from '@/lib/db/plates';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const plate = await updatePlate(id, {
      name: body.name,
      color: body.color,
      type: body.type,
      description: body.description,
      icon: body.icon,
      status: body.status,
    });

    if (!plate) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plate not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: plate });
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

    const existing = await getPlateById(id);
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Plate not found' } },
        { status: 404 }
      );
    }

    const plate = await archivePlate(id);
    return NextResponse.json({ data: plate });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
