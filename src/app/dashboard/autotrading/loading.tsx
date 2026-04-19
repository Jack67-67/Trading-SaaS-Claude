export default function AutotradingLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-surface-3 rounded" />
          <div className="h-7 w-44 bg-surface-3 rounded" />
          <div className="h-3 w-64 bg-surface-3 rounded" />
        </div>
        <div className="h-10 w-32 bg-surface-3 rounded-xl" />
      </div>

      {/* Global status hero */}
      <div className="rounded-2xl border border-border bg-surface-1 px-6 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-surface-3" />
            <div className="h-3 w-20 bg-surface-3 rounded" />
            <div className="h-5 w-28 bg-surface-3 rounded-full" />
          </div>
          <div className="h-3 w-40 bg-surface-3 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-20 bg-surface-3 rounded" />
              <div className="h-7 w-28 bg-surface-3 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Session cards */}
      <div className="space-y-1">
        <div className="h-2.5 w-28 bg-surface-3 rounded mb-3" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-1 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-3 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 bg-surface-3 rounded" />
                  <div className="h-4 w-16 bg-surface-3 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-12 bg-surface-3 rounded" />
                  <div className="h-3 w-8 bg-surface-3 rounded" />
                  <div className="h-3 w-24 bg-surface-3 rounded" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-surface-3 rounded" />
                <div className="h-5 w-16 bg-surface-3 rounded" />
              </div>
            </div>
            {/* Metrics strip skeleton for first card */}
            {i === 0 && (
              <div className="mt-3 ml-11 grid grid-cols-4 gap-5 border-t border-border/60 pt-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-2.5 w-14 bg-surface-3 rounded" />
                    <div className="h-4 w-12 bg-surface-3 rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-1 border-b border-border">
          <div className="h-3 w-28 bg-surface-3 rounded" />
        </div>
        <div className="divide-y divide-border/50 bg-surface-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-surface-3 shrink-0" />
              <div className="flex-1 flex items-center gap-2">
                <div className="h-3 w-32 bg-surface-3 rounded" />
                <div className="h-3 w-24 bg-surface-3 rounded" />
              </div>
              <div className="h-2.5 w-10 bg-surface-3 rounded" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
