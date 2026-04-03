export default function SettingsLoading() {
  return (
    <div className="space-y-5 animate-pulse max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-24 bg-surface-2 rounded-lg" />
        <div className="h-4 w-56 bg-surface-2 rounded" />
      </div>

      {/* Account section */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-surface-3" />
          <div className="h-4 w-20 bg-surface-3 rounded" />
        </div>
        <div className="px-5 py-4 space-y-5">
          {/* Avatar row */}
          <div className="flex items-center gap-4 pb-5 border-b border-border">
            <div className="w-14 h-14 rounded-2xl bg-surface-3" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-surface-3 rounded" />
              <div className="h-3 w-48 bg-surface-2 rounded" />
            </div>
            <div className="h-7 w-14 bg-surface-3 rounded-lg" />
          </div>
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-3.5 h-3.5 bg-surface-3 rounded mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-surface-2 rounded" />
                  <div className="h-3.5 w-28 bg-surface-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API section */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-surface-3" />
          <div className="h-4 w-24 bg-surface-3 rounded" />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="h-3 w-full bg-surface-2 rounded" />
          <div className="h-3 w-4/5 bg-surface-2 rounded" />
          <div className="h-11 bg-surface-0 rounded-lg border border-border" />
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-surface-3" />
          <div className="h-4 w-24 bg-surface-3 rounded" />
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 bg-surface-2 rounded" />
              <div className="h-3 w-48 bg-surface-2 rounded" />
            </div>
            <div className="h-8 w-24 bg-surface-3 rounded-lg" />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 bg-surface-2 rounded" />
              <div className="h-3 w-56 bg-surface-2 rounded" />
            </div>
            <div className="h-8 w-20 bg-surface-3 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
