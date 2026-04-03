export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-3.5 w-24 bg-surface-2 rounded" />
          <div className="h-8 w-48 bg-surface-2 rounded-lg" />
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-3 w-32 bg-surface-2 rounded ml-auto" />
          <div className="h-3 w-24 bg-surface-2 rounded ml-auto" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-1 border border-border p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-2.5 w-20 bg-surface-3 rounded" />
              <div className="w-7 h-7 rounded-lg bg-surface-3" />
            </div>
            <div className="h-9 w-16 bg-surface-3 rounded" />
            <div className="h-3 w-28 bg-surface-2 rounded" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent backtests */}
        <div className="lg:col-span-2 rounded-2xl bg-surface-1 border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-surface-3 rounded" />
              <div className="h-3 w-24 bg-surface-2 rounded" />
            </div>
            <div className="h-3 w-16 bg-surface-2 rounded" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-surface-2 rounded" />
                  <div className="flex gap-1.5">
                    <div className="h-4 w-12 bg-surface-3 rounded" />
                    <div className="h-4 w-8 bg-surface-3 rounded" />
                  </div>
                </div>
                <div className="h-3.5 w-14 bg-surface-2 rounded" />
                <div className="h-5 w-20 bg-surface-2 rounded-md" />
                <div className="h-3 w-28 bg-surface-2 rounded hidden md:block" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-2xl bg-surface-1 border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border space-y-1.5">
              <div className="h-4 w-28 bg-surface-3 rounded" />
              <div className="h-3 w-20 bg-surface-2 rounded" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-3" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 bg-surface-2 rounded" />
                    <div className="h-3 w-32 bg-surface-2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Spotlight */}
          <div className="rounded-2xl bg-surface-1 border border-border p-5 space-y-3">
            <div className="h-2.5 w-24 bg-surface-2 rounded" />
            <div className="h-10 w-28 bg-surface-3 rounded" />
            <div className="h-3.5 w-36 bg-surface-2 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
