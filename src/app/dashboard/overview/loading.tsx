export default function OverviewLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-52 bg-surface-2 rounded-lg" />
          <div className="h-3.5 w-36 bg-surface-2 rounded" />
        </div>
        <div className="h-8 w-28 bg-surface-2 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-1 border border-border p-5 space-y-3">
            <div className="h-2.5 w-20 bg-surface-3 rounded" />
            <div className="h-8 w-16 bg-surface-3 rounded" />
            <div className="h-3 w-24 bg-surface-2 rounded" />
          </div>
        ))}
      </div>

      {/* Strategy cards */}
      <div className="rounded-2xl bg-surface-1 border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-surface-3 rounded" />
            <div className="h-3 w-24 bg-surface-2 rounded" />
          </div>
          <div className="h-3 w-16 bg-surface-2 rounded" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-surface-2 rounded" />
                <div className="h-3 w-52 bg-surface-2 rounded" />
                <div className="flex gap-1.5 mt-1">
                  <div className="h-5 w-16 bg-surface-3 rounded-full" />
                  <div className="h-5 w-20 bg-surface-3 rounded-full" />
                </div>
              </div>
              <div className="text-right space-y-1.5 shrink-0">
                <div className="h-5 w-16 bg-surface-2 rounded ml-auto" />
                <div className="h-3 w-12 bg-surface-2 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts block */}
      <div className="rounded-2xl bg-surface-1 border border-border p-5 space-y-3">
        <div className="h-4 w-28 bg-surface-3 rounded" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-2 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
