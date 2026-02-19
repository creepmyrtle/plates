'use client';

import Link from 'next/link';

export default function PlateError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <span className="text-5xl">⚠️</span>
      <h1 className="mt-4 text-2xl font-bold">Failed to load plate</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Something went wrong loading this plate.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Try again
        </button>
        <Link
          href="/plates"
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
        >
          Back to Plates
        </Link>
      </div>
    </div>
  );
}
