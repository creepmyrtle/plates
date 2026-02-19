import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getPlatesByUserId, createPlate } from '@/lib/db/plates';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const plates = await getPlatesByUserId(userId);
    return NextResponse.json({ data: plates });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = await request.json();

    if (!body.name || !body.color) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'Name and color are required' } },
        { status: 400 }
      );
    }

    const plate = await createPlate(userId, {
      name: body.name,
      color: body.color,
      type: body.type,
      description: body.description,
      icon: body.icon,
    });

    return NextResponse.json({ data: plate }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
