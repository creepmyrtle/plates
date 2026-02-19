export default function PlateDetailLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="h-24 bg-bg-card animate-pulse" />

      <div className="px-4 pt-4 space-y-3">
        {/* Filter tabs skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-bg-card animate-pulse" />
          ))}
        </div>

        {/* Task card skeletons */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[72px] rounded-lg border border-border bg-bg-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}
