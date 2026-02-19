import { getSessionUserId } from '@/lib/auth';
import { getPlatesByUserId } from '@/lib/db/plates';
import PlatesList from './PlatesList';

export const dynamic = 'force-dynamic';

export default async function PlatesPage() {
  const userId = await getSessionUserId();
  const plates = await getPlatesByUserId(userId);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plates</h1>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        The areas of your life you&apos;re keeping spinning.
      </p>
      <PlatesList initialPlates={plates} />
    </div>
  );
}
