export default function AutotradingDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-3xl">

      {/* Breadcrumb */}
      <div className="h-3 w-28 bg-surface-3 rounded" />

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-surface-1 px-6 py-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-surface-3 rounded-full" />
              <div className="h-5 w-28 bg-surface-3 rounded-full" />
            </div>
            <div className="h-7 w-52 bg-surface-3 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 bg-surface-3 rounded" />
              <div className="h-3 w-8 bg-surface-3 rounded" />
              <div className="h-3 w-36 bg-surface-3 rounded" />
            </div>
          </div>
          <div className="h-9 w-28 bg-surface-3 rounded-xl shrink-0" />
        </div>
        {/* Capital strip */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-5 border-t border-border/60 pt-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-16 bg-surface-3 rounded" />
              <div className="h-6 w-24 bg-surface-3 rounded" />
              <div className="h-2 w-12 bg-surface-3 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Performance grid */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="h-3 w-24 bg-surface-3 rounded" />
        </div>
        <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-16 bg-surface-3 rounded" />
              <div className="h-6 w-20 bg-surface-3 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Trade history */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-1 border-b border-border flex items-center justify-between">
          <div className="h-3 w-24 bg-surface-3 rounded" />
          <div className="h-3 w-20 bg-surface-3 rounded" />
        </div>
        <div className="divide-y divide-border/50 bg-surface-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="h-5 w-12 bg-surface-3 rounded shrink-0" />
              <div className="h-3 w-12 bg-surface-3 rounded shrink-0" />
              <div className="flex items-center gap-1.5 flex-1">
                <div className="h-3 w-16 bg-surface-3 rounded" />
                <div className="h-2.5 w-4 bg-surface-3 rounded" />
                <div className="h-3 w-16 bg-surface-3 rounded" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-3 w-14 bg-surface-3 rounded" />
                <div className="h-2.5 w-10 bg-surface-3 rounded ml-auto" />
              </div>
              <div className="space-y-1 text-right pl-2">
                <div className="h-2.5 w-12 bg-surface-3 rounded" />
                <div className="h-2 w-10 bg-surface-3 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control center */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Status bar */}
        <div className="px-5 py-4 bg-surface-1 border-b border-border space-y-2">
          <div className="h-4 w-64 bg-surface-3 rounded" />
          <div className="h-3 w-48 bg-surface-3 rounded" />
        </div>
        {/* Toggle row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-surface-3 rounded" />
            <div className="h-3 w-52 bg-surface-3 rounded" />
          </div>
          <div className="h-6 w-11 bg-surface-3 rounded-full" />
        </div>
        {/* Safety limits row */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="h-3 w-24 bg-surface-3 rounded" />
          <div className="h-3 w-3 bg-surface-3 rounded" />
        </div>
        {/* Actions row */}
        <div className="flex items-center justify-between px-5 py-4 gap-3">
          <div className="h-8 w-28 bg-surface-3 rounded-lg" />
          <div className="h-8 w-24 bg-surface-3 rounded-lg ml-auto" />
        </div>
      </div>

    </div>
  );
}
