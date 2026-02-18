import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getPillarsByUserId, createPillar } from '@/lib/db/pillars';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const pillars = await getPillarsByUserId(userId);
    return NextResponse.json({ data: pillars });
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

    const pillar = await createPillar(userId, {
      name: body.name,
      color: body.color,
      type: body.type,
      description: body.description,
      icon: body.icon,
    });

    return NextResponse.json({ data: pillar }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
