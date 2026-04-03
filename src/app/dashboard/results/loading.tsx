export default function ResultsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-24 bg-surface-2 rounded-lg" />
        <div className="h-4 w-80 bg-surface-2 rounded mt-2" />
      </div>

      <div className="rounded-xl bg-surface-1 border border-border overflow-hidden">
        {/* Table header */}
        <div className="border-b border-border px-5 py-3 flex gap-6">
          {[120, 100, 60, 60, 60, 80].map((w, i) => (
            <div key={i} className="h-3 bg-surface-3 rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-border flex items-center gap-6">
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-40 bg-surface-2 rounded" />
              <div className="h-3 w-24 bg-surface-2 rounded" />
            </div>
            <div className="h-3.5 w-24 bg-surface-2 rounded" />
            <div className="h-3.5 w-14 bg-surface-2 rounded ml-auto" />
            <div className="h-3.5 w-10 bg-surface-2 rounded" />
            <div className="h-3.5 w-14 bg-surface-2 rounded" />
            <div className="h-3.5 w-8 bg-surface-2 rounded" />
            <div className="h-3.5 w-28 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
