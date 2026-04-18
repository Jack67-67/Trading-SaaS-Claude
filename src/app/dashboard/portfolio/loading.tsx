export default function PortfolioLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-7 w-40 bg-surface-2 rounded-lg" />
        <div className="h-3.5 w-56 bg-surface-2 rounded" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-1 border border-border p-5 space-y-3">
            <div className="h-2.5 w-20 bg-surface-3 rounded" />
            <div className="h-8 w-16 bg-surface-3 rounded" />
            <div className="h-3 w-24 bg-surface-2 rounded" />
          </div>
        ))}
      </div>

      {/* Strategy table */}
      <div className="rounded-2xl bg-surface-1 border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-surface-3 rounded" />
            <div className="h-3 w-20 bg-surface-2 rounded" />
          </div>
          <div className="h-8 w-24 bg-surface-2 rounded-lg" />
        </div>
        {/* Column headers */}
        <div className="border-b border-border px-5 py-2.5 flex gap-6">
          {[140, 80, 60, 60, 80, 100].map((w, i) => (
            <div key={i} className="h-2.5 bg-surface-3 rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-border flex items-center gap-6">
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 bg-surface-2 rounded" />
              <div className="flex gap-1.5">
                <div className="h-4 w-12 bg-surface-3 rounded" />
                <div className="h-4 w-8 bg-surface-3 rounded" />
              </div>
            </div>
            <div className="h-3.5 w-14 bg-surface-2 rounded" />
            <div className="h-3.5 w-10 bg-surface-2 rounded" />
            <div className="h-3.5 w-14 bg-surface-2 rounded" />
            <div className="h-5 w-20 bg-surface-2 rounded-full" />
            <div className="h-3.5 w-28 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
