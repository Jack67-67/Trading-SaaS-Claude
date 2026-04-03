export default function BacktestsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-surface-2 rounded-lg" />
          <div className="h-4 w-72 bg-surface-2 rounded" />
        </div>
        <div className="flex items-center gap-5">
          <div className="space-y-1.5 text-right">
            <div className="h-3 w-16 bg-surface-2 rounded ml-auto" />
            <div className="h-5 w-10 bg-surface-3 rounded ml-auto" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-3 w-20 bg-surface-2 rounded ml-auto" />
            <div className="h-5 w-10 bg-surface-3 rounded ml-auto" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form skeleton */}
        <div className="xl:col-span-3 rounded-xl bg-surface-1 border border-border p-5 space-y-5">
          <div className="h-4 w-36 bg-surface-3 rounded" />
          <div className="h-10 bg-surface-2 rounded-lg" />
          <div className="h-10 bg-surface-2 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-surface-2 rounded-lg" />
            <div className="h-10 bg-surface-2 rounded-lg" />
          </div>
          <div className="h-20 bg-surface-2 rounded-lg" />
          <div className="h-11 w-44 bg-surface-2 rounded-lg" />
        </div>

        {/* Run history skeleton */}
        <div className="xl:col-span-2 rounded-2xl bg-surface-1 border border-border overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-surface-3 rounded" />
              <div className="h-3 w-16 bg-surface-2 rounded" />
            </div>
            <div className="h-3 w-20 bg-surface-2 rounded" />
          </div>
          <div className="divide-y divide-border bg-surface-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-1.5 h-1.5 rounded-full bg-surface-3 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-24 bg-surface-2 rounded" />
                  <div className="flex gap-1.5">
                    <div className="h-4 w-10 bg-surface-3 rounded" />
                    <div className="h-4 w-8 bg-surface-3 rounded" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-surface-2 rounded-md" />
                <div className="h-3 w-20 bg-surface-2 rounded hidden lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
