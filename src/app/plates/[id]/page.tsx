import { notFound } from 'next/navigation';
import { getPlateById } from '@/lib/db/plates';
import { getTasksByPlateId } from '@/lib/db/tasks';
import { getMilestonesByPlateId } from '@/lib/db/milestones';
import PlateDetail from './PlateDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlateDetailPage({ params }: Props) {
  const { id } = await params;
  const plate = await getPlateById(id);

  if (!plate) notFound();

  const [tasks, milestones] = await Promise.all([
    getTasksByPlateId(id),
    getMilestonesByPlateId(id),
  ]);

  return <PlateDetail plate={plate} initialTasks={tasks} initialMilestones={milestones} />;
}
