import { NextResponse } from 'next/server';
import { getMilestoneById, updateMilestone, deleteMilestone } from '@/lib/db/milestones';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const milestone = await updateMilestone(id, {
      name: body.name,
      description: body.description,
      target_date: body.target_date,
      completed: body.completed,
    });

    if (!milestone) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Milestone not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: milestone });
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

    const existing = await getMilestoneById(id);
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Milestone not found' } },
        { status: 404 }
      );
    }

    await deleteMilestone(id);
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
