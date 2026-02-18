import { getSessionUserId } from '@/lib/auth';
import { getPillarsByUserId } from '@/lib/db/pillars';
import PillarsList from './PillarsList';

export default async function PillarsPage() {
  const userId = await getSessionUserId();
  const pillars = await getPillarsByUserId(userId);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pillars</h1>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        The areas of your life you&apos;re keeping spinning.
      </p>
      <PillarsList initialPillars={pillars} />
    </div>
  );
}
