import { Sparkles } from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface AiStatusBarProps {
  strategyCount: number;
  lastRunAt: string | null;
}

export function AiStatusBar({ strategyCount, lastRunAt }: AiStatusBarProps) {
  if (strategyCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        {/* Pulsing active dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
        </span>
        <span className="text-xs text-text-secondary">
          AI is monitoring your{" "}
          <span className="font-semibold text-text-primary">
            {strategyCount} {strategyCount === 1 ? "strategy" : "strategies"}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lastRunAt ? (
          <span className="text-2xs text-text-muted">
            Last analysis:{" "}
            <span className="text-text-secondary font-medium">{timeAgo(lastRunAt)}</span>
          </span>
        ) : (
          <span className="text-2xs text-text-muted">No runs yet</span>
        )}
        <Sparkles size={11} className="text-accent/50" />
      </div>
    </div>
  );
}
