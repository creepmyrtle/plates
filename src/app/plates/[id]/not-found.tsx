import Link from 'next/link';

export default function PlateNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="mt-4 text-2xl font-bold">Plate not found</h1>
      <p className="mt-2 text-sm text-text-secondary">
        This plate may have been archived or deleted.
      </p>
      <Link
        href="/plates"
        className="mt-6 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
      >
        Back to Plates
      </Link>
    </div>
  );
}
