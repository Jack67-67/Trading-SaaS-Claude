export default function StrategiesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-surface-2 rounded-lg" />
          <div className="h-4 w-64 bg-surface-2 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 bg-surface-2 rounded" />
          <div className="h-9 w-32 bg-surface-2 rounded-lg" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-1 border border-border p-5 space-y-3 overflow-hidden relative">
            {/* Accent line */}
            <div className="absolute top-0 left-5 right-5 h-px bg-surface-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-3" />
                <div className="h-4 w-28 bg-surface-3 rounded" />
              </div>
              <div className="w-4 h-4 bg-surface-2 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-surface-2 rounded" />
              <div className="h-3 w-3/4 bg-surface-2 rounded" />
            </div>
            <div className="h-20 bg-surface-0 rounded-lg border border-border" />
            <div className="flex items-center justify-between pt-0.5">
              <div className="h-4 w-14 bg-surface-3 rounded" />
              <div className="h-3 w-28 bg-surface-2 rounded" />
            </div>
          </div>
        ))}
        {/* Ghost add card */}
        <div className="rounded-2xl border-2 border-dashed border-border h-[200px] flex items-center justify-center">
          <div className="w-9 h-9 bg-surface-2 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
