import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatPercent, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types";
import type { Database } from "@/types/supabase";

type BacktestRow = Database["public"]["Tables"]["backtest_runs"]["Row"] & {
  strategies?: { name: string } | null;
};

interface RecentBacktestsProps {
  runs: BacktestRow[];
}

export function RecentBacktests({ runs }: RecentBacktestsProps) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-1">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Recent Backtests</h2>
          <p className="text-xs text-text-muted mt-0.5">Your latest runs at a glance</p>
        </div>
        <Link
          href="/dashboard/backtests"
          className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Empty state */}
      {runs.length === 0 && (
        <div className="bg-surface-0 px-5 py-14 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center mb-3">
            <span className="text-lg">⚗️</span>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No backtests yet</p>
          <p className="text-xs text-text-muted mb-4 max-w-xs">
            Create a strategy and run your first backtest to see results here.
          </p>
          <Link
            href="/dashboard/strategies/new"
            className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Create a strategy →
          </Link>
        </div>
      )}

      {/* Run list */}
      {runs.length > 0 && (
        <div className="divide-y divide-border bg-surface-0">
          {runs.map((run) => {
            const config = run.config as Record<string, unknown>;
            const symbol = (config?.symbol as string) ?? "—";
            const interval = (config?.interval as string) ?? "";
            const runName = (config?.name as string) || symbol;
            const strategyName = run.strategies?.name || null;

            const results = run.results as Record<string, unknown> | null;
            const metrics = results?.metrics as Record<string, number> | null;
            const returnPct = run.status === "completed" ? metrics?.total_return_pct : undefined;

            const isClickable = ["completed", "running", "pending", "failed", "cancelled"].includes(run.status);
            const href = run.status === "completed"
              ? `/dashboard/results/${run.id}`
              : `/dashboard/backtests/${run.id}`;

            const row = (
              <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-1 transition-colors group">
                {/* Run info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                    {runName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                      {symbol}
                    </span>
                    {interval && (
                      <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                        {interval}
                      </span>
                    )}
                    {strategyName && (
                      <span className="text-2xs text-text-muted truncate hidden sm:block">
                        · {strategyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Return (completed only) */}
                <div className="w-20 text-right shrink-0">
                  {returnPct !== undefined ? (
                    <span className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(returnPct))}>
                      {formatPercent(returnPct)}
                    </span>
                  ) : (
                    <span className="text-sm text-text-muted">—</span>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                  <StatusBadge status={run.status as BacktestStatus} />
                </div>

                {/* Date — hidden on small screens */}
                <div className="w-32 text-right shrink-0 hidden md:block">
                  <p className="text-xs text-text-muted">{formatDateTime(run.created_at)}</p>
                </div>
              </div>
            );

            return isClickable ? (
              <Link key={run.id} href={href} className="block">
                {row}
              </Link>
            ) : (
              <div key={run.id}>{row}</div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      {runs.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-surface-1 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {runs.length} most recent run{runs.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/dashboard/results"
            className="text-xs text-accent hover:text-accent-hover font-medium transition-colors flex items-center gap-1"
          >
            View completed results <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
