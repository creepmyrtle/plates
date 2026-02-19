export default function DashboardLoading() {
  return (
    <div className="px-4 pt-6">
      <div className="h-7 w-36 rounded bg-bg-card animate-pulse" />
      <div className="mt-1 h-4 w-48 rounded bg-bg-card animate-pulse" />

      {/* Stat cards skeleton */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[76px] rounded-lg border border-border bg-bg-card animate-pulse" />
        ))}
      </div>

      {/* Plate health skeleton */}
      <div className="mt-5 h-48 rounded-lg border border-border bg-bg-card animate-pulse" />

      {/* Deadlines skeleton */}
      <div className="mt-5 h-32 rounded-lg border border-border bg-bg-card animate-pulse" />
    </div>
  );
}
