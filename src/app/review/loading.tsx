export default function ReviewLoading() {
  return (
    <div className="px-4 pt-6">
      <div className="h-7 w-40 rounded bg-bg-card animate-pulse" />
      <div className="mt-1 h-4 w-32 rounded bg-bg-card animate-pulse" />

      <div className="mt-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg border border-border bg-bg-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}
