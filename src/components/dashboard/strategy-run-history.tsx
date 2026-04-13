import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight, Play, Minus } from "lucide-react";
import { cn, formatPercent, pnlColor } from "@/lib/utils";

export interface StrategyRunRow {
  id: string;
  name: string;
  symbol: string;
  interval: string;
  completedAt: string;
  returnPct: number;
  sharpe: number;
  drawdown: number;
  winRate: number;
  trades: number;
}

// ── Mini sparkline ──────────────────────────────────────────────────────────

function ReturnSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 72, H = 28, PAD = 3;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const trending = values[values.length - 1] >= values[0];
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible shrink-0"
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={trending ? "var(--color-profit, #22c55e)" : "var(--color-loss, #ef4444)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      {(() => {
        const last = values[values.length - 1];
        const x = W;
        const y = H - PAD - ((last - min) / range) * (H - PAD * 2);
        return (
          <circle
            cx={x}
            cy={y}
            r="2.5"
            fill={trending ? "var(--color-profit, #22c55e)" : "var(--color-loss, #ef4444)"}
          />
        );
      })()}
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function StrategyRunHistory({
  runs,
  strategyId,
}: {
  runs: StrategyRunRow[];
  strategyId: string;
}) {
  if (runs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 px-6 py-10 text-center">
        <p className="text-sm font-medium text-text-secondary mb-1">No completed runs yet</p>
        <p className="text-xs text-text-muted mb-4">
          Run a backtest to start tracking this strategy&apos;s performance over time.
        </p>
        <Link
          href={`/dashboard/backtests?strategy=${strategyId}`}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          <Play size={13} />
          Run First Backtest
        </Link>
      </div>
    );
  }

  const returnValues = runs.map((r) => r.returnPct);
  const latest = runs[runs.length - 1];
  const prev = runs.length >= 2 ? runs[runs.length - 2] : null;
  const returnDelta = prev !== null ? latest.returnPct - prev.returnPct : null;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* ── Panel header ───────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border bg-surface-1 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Performance History
            </p>
            <p className="text-sm text-text-secondary mt-0.5">
              {runs.length} completed {runs.length === 1 ? "run" : "runs"}
            </p>
          </div>

          {/* Sparkline + delta */}
          {returnValues.length >= 2 && (
            <div className="flex items-center gap-3">
              <ReturnSparkline values={returnValues} />
              {returnDelta !== null && (
                <div className="text-right">
                  <p className="text-2xs text-text-muted">vs prev run</p>
                  <p
                    className={cn(
                      "text-sm font-mono font-bold tabular-nums",
                      returnDelta > 0 ? "text-profit" : returnDelta < 0 ? "text-loss" : "text-text-muted"
                    )}
                  >
                    {returnDelta > 0 ? "+" : ""}{returnDelta.toFixed(1)}pp
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Link
          href={`/dashboard/backtests?strategy=${strategyId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors shrink-0"
        >
          <Play size={12} />
          Run Again
        </Link>
      </div>

      {/* ── Run rows — newest first ─────────────────────────────── */}
      <div className="divide-y divide-border bg-surface-0">
        {[...runs].reverse().map((run, i) => {
          const runNum = runs.length - i;
          const isLatest = i === 0;

          return (
            <Link
              key={run.id}
              href={`/dashboard/results/${run.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-1 transition-colors group"
            >
              {/* Run number */}
              <span className="text-2xs font-mono text-text-muted/50 w-5 shrink-0 tabular-nums">
                #{runNum}
              </span>

              {/* Latest badge */}
              {isLatest && (
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent leading-none shrink-0">
                  Latest
                </span>
              )}

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                  {run.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                    {run.symbol}
                  </span>
                  <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                    {run.interval}
                  </span>
                  <span className="text-2xs text-text-muted">{run.trades} trades</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-right hidden md:block">
                  <p className="text-2xs text-text-muted">Sharpe</p>
                  <p className="text-xs font-mono text-text-secondary tabular-nums">
                    {run.sharpe.toFixed(2)}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-2xs text-text-muted">Drawdown</p>
                  <p className="text-xs font-mono text-loss tabular-nums">
                    {run.drawdown.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-text-muted tabular-nums">
                    {new Date(run.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {run.returnPct > 0.5 ? (
                      <TrendingUp size={10} className="text-profit" />
                    ) : run.returnPct < -0.5 ? (
                      <TrendingDown size={10} className="text-loss" />
                    ) : (
                      <Minus size={10} className="text-text-muted" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-mono font-bold tabular-nums",
                        pnlColor(run.returnPct)
                      )}
                    >
                      {formatPercent(run.returnPct)}
                    </span>
                  </div>
                </div>

                <ArrowRight
                  size={12}
                  className="text-text-muted/40 group-hover:text-accent transition-colors shrink-0"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
