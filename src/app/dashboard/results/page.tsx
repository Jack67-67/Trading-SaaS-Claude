import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPercent, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Results",
};

export default async function ResultsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: runs } = await supabase
    .from("backtest_runs")
    .select("*, strategies(name)")
    .eq("user_id", user!.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(50);

  const items = runs ?? [];

  // Compute summary stats for the header banner
  const allMetrics = items.map((r) => {
    const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | null;
    return m;
  }).filter(Boolean) as Record<string, number>[];

  const bestReturn = allMetrics.length
    ? Math.max(...allMetrics.map((m) => m.total_return_pct ?? 0))
    : null;
  const avgSharpe = allMetrics.length
    ? allMetrics.reduce((s, m) => s + (m.sharpe_ratio ?? 0), 0) / allMetrics.length
    : null;
  const maxReturn = Math.max(...allMetrics.map((m) => Math.abs(m.total_return_pct ?? 0)), 1);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Results</h1>
          <p className="text-sm text-text-secondary mt-1">
            Performance summary across all completed backtests.
          </p>
        </div>

        {/* Summary stats strip */}
        {items.length > 0 && (
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-2xs text-text-muted uppercase tracking-wider">Runs</p>
              <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{items.length}</p>
            </div>
            {bestReturn !== null && (
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider">Best Return</p>
                <p className={cn("text-lg font-bold font-mono mt-0.5", pnlColor(bestReturn))}>
                  {formatPercent(bestReturn)}
                </p>
              </div>
            )}
            {avgSharpe !== null && (
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider">Avg Sharpe</p>
                <p className={cn("text-lg font-bold font-mono mt-0.5", pnlColor(avgSharpe - 1))}>
                  {avgSharpe.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {items.length === 0 && (
        <div className="rounded-2xl bg-surface-1 border border-border flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-sm font-semibold text-text-secondary mb-1">No completed backtests yet</p>
          <p className="text-xs text-text-muted max-w-xs mb-5">
            Run a backtest and results will appear here automatically once completed.
          </p>
          <Link href="/dashboard/backtests" className="text-sm text-accent hover:text-accent-hover font-medium transition-colors">
            Go to Backtests →
          </Link>
        </div>
      )}

      {/* ── Results table ─────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_130px_100px_100px_80px_120px] bg-surface-1 border-b border-border px-5 py-2.5 gap-4">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Run</p>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider hidden sm:block">Strategy</p>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider text-right">Return</p>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider text-right hidden md:block">Sharpe</p>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider text-right hidden md:block">Win Rate</p>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider text-right hidden lg:block">Trades</p>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider text-right hidden lg:block">Completed</p>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border bg-surface-0">
            {items.map((run) => {
              const config = run.config as Record<string, unknown>;
              const strategyRef = run.strategies as Record<string, unknown> | null;
              const results = run.results as Record<string, unknown> | null;
              const metrics = results?.metrics as Record<string, number> | null;

              const symbol = (config?.symbol as string) || "—";
              const interval = (config?.interval as string) || "";
              const runName = (config?.name as string) || symbol;
              const strategyName = (strategyRef?.name as string) || "—";

              const returnPct = metrics?.total_return_pct;
              const sharpe = metrics?.sharpe_ratio;
              const winRate = metrics?.win_rate_pct;
              const totalTrades = metrics?.total_trades;

              const isUp = returnPct !== undefined ? returnPct >= 0 : null;
              const barWidth = returnPct !== undefined
                ? Math.round((Math.abs(returnPct) / maxReturn) * 100)
                : 0;

              return (
                <Link
                  key={run.id}
                  href={`/dashboard/results/${run.id}`}
                  className="grid grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_130px_100px_100px_80px_120px] items-center px-5 py-3.5 gap-4 hover:bg-surface-1 transition-colors group"
                >
                  {/* Run name */}
                  <div className="min-w-0">
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
                    </div>
                  </div>

                  {/* Strategy */}
                  <p className="text-sm text-text-secondary truncate hidden sm:block">{strategyName}</p>

                  {/* Return + bar */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isUp !== null && (
                        isUp
                          ? <TrendingUp size={12} className="text-profit shrink-0" />
                          : <TrendingDown size={12} className="text-loss shrink-0" />
                      )}
                      <span className={cn(
                        "text-sm font-mono font-bold tabular-nums",
                        returnPct !== undefined ? pnlColor(returnPct) : "text-text-muted"
                      )}>
                        {returnPct !== undefined ? formatPercent(returnPct) : "—"}
                      </span>
                    </div>
                    {returnPct !== undefined && (
                      <div className="mt-1.5 h-1 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", isUp ? "bg-profit/70" : "bg-loss/70")}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sharpe */}
                  <div className="text-right hidden md:block">
                    <span className={cn(
                      "text-sm font-mono font-semibold tabular-nums",
                      sharpe !== undefined ? pnlColor(sharpe - 1) : "text-text-muted"
                    )}>
                      {sharpe !== undefined ? sharpe.toFixed(2) : "—"}
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="text-right hidden md:block">
                    {winRate !== undefined ? (
                      <>
                        <span className={cn(
                          "text-sm font-mono font-semibold tabular-nums",
                          pnlColor(winRate - 50)
                        )}>
                          {winRate.toFixed(1)}%
                        </span>
                        <div className="mt-1.5 h-1 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", winRate >= 50 ? "bg-profit/70" : "bg-loss/70")}
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-mono text-text-muted">—</span>
                    )}
                  </div>

                  {/* Trades */}
                  <p className="text-sm font-mono text-text-secondary text-right hidden lg:block">
                    {totalTrades !== undefined ? String(totalTrades) : "—"}
                  </p>

                  {/* Completed */}
                  <p className="text-2xs text-text-muted text-right hidden lg:block">
                    {run.completed_at ? formatDateTime(run.completed_at) : "—"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
