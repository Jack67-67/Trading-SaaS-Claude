export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-64 bg-surface-2 rounded-lg" />
        <div className="h-4 w-80 bg-surface-2 rounded-md mt-2" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-surface-1 border border-border p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-surface-3 rounded" />
                <div className="h-7 w-12 bg-surface-3 rounded" />
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl bg-surface-1 border border-border p-5">
          <div className="h-4 w-32 bg-surface-3 rounded mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-24 bg-surface-2 rounded" />
                <div className="h-4 w-16 bg-surface-2 rounded" />
                <div className="h-4 flex-1 bg-surface-2 rounded" />
                <div className="h-4 w-12 bg-surface-2 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-surface-1 border border-border p-5">
          <div className="h-4 w-28 bg-surface-3 rounded mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-surface-2 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
