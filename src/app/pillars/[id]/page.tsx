import { notFound } from 'next/navigation';
import { getPillarById } from '@/lib/db/pillars';
import { getTasksByPillarId } from '@/lib/db/tasks';
import { getMilestonesByPillarId } from '@/lib/db/milestones';
import PillarDetail from './PillarDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PillarDetailPage({ params }: Props) {
  const { id } = await params;
  const pillar = await getPillarById(id);

  if (!pillar) notFound();

  const [tasks, milestones] = await Promise.all([
    getTasksByPillarId(id),
    getMilestonesByPillarId(id),
  ]);

  return <PillarDetail pillar={pillar} initialTasks={tasks} initialMilestones={milestones} />;
}
