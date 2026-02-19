export default function PlatesLoading() {
  return (
    <div className="px-4 pt-6">
      <div className="h-7 w-32 rounded bg-bg-card animate-pulse" />
      <div className="mt-1 h-4 w-48 rounded bg-bg-card animate-pulse" />

      <div className="mt-5 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[88px] rounded-lg border border-border bg-bg-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}
