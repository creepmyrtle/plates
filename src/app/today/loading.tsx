export default function TodayLoading() {
  return (
    <div className="px-4 pt-6">
      <div className="h-7 w-40 rounded bg-bg-card animate-pulse" />
      <div className="mt-1 h-4 w-28 rounded bg-bg-card animate-pulse" />

      {/* Progress bar skeleton */}
      <div className="mt-5 rounded-lg border border-border bg-bg-card p-4">
        <div className="h-3 w-24 rounded bg-bg-secondary animate-pulse" />
        <div className="mt-3 h-2.5 rounded-full bg-bg-secondary animate-pulse" />
      </div>

      {/* Task card skeletons */}
      <div className="mt-5 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[72px] rounded-lg border border-border bg-bg-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}
