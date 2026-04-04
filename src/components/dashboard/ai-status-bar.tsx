import { Sparkles, FlaskConical } from "lucide-react";
import Link from "next/link";

interface AiStatusBarProps {
  strategyCount: number;
  lastRunAt: string | null;
}

export function AiStatusBar({ strategyCount, lastRunAt }: AiStatusBarProps) {
  if (strategyCount === 0) return null;

  // Only shown when strategies exist but no completed runs yet
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-1 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            AI is ready to analyze your {strategyCount === 1 ? "strategy" : `${strategyCount} strategies`}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Run a backtest and the AI will generate performance insights, risk scores, and recommendations.
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/backtests"
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors whitespace-nowrap"
      >
        <FlaskConical size={13} />
        Run first test
      </Link>
    </div>
  );
}
