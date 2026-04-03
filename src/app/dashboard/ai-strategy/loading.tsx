export default function AiStrategyLoading() {
  return (
    <div className="max-w-2xl space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-surface-2" />
          <div className="h-6 w-52 bg-surface-2 rounded-lg" />
          <div className="h-5 w-10 bg-surface-2 rounded" />
        </div>
        <div className="h-4 w-96 bg-surface-2 rounded ml-9" />
      </div>

      {/* Risk level */}
      <div className="space-y-3">
        <div className="h-4 w-20 bg-surface-2 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-surface-1 border border-border" />
          ))}
        </div>
      </div>

      {/* Timeframe */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-surface-2 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-surface-1 border border-border" />
          ))}
        </div>
      </div>

      {/* Symbol */}
      <div className="h-10 bg-surface-2 rounded-lg" />

      {/* Goal */}
      <div className="h-16 bg-surface-2 rounded-lg" />

      {/* Button */}
      <div className="h-12 w-56 bg-surface-2 rounded-lg" />
    </div>
  );
}
