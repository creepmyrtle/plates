import { NextResponse } from 'next/server';
import { getMilestonesByPillarId, createMilestone } from '@/lib/db/milestones';
import { getPillarById } from '@/lib/db/pillars';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const milestones = await getMilestonesByPillarId(id);
    return NextResponse.json({ data: milestones });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const pillar = await getPillarById(id);
    if (!pillar) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Pillar not found' } },
        { status: 404 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: 'Name is required' } },
        { status: 400 }
      );
    }

    const milestone = await createMilestone({
      pillar_id: id,
      name: body.name,
      description: body.description,
      target_date: body.target_date,
    });

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
