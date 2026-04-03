"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, BarChart3, Activity,
  AlertTriangle, Play, TrendingUp, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useBacktestRealtime } from "@/hooks/use-backtest-realtime";
import { formatDateTime, formatPercent, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestRun, BacktestConfig, BacktestStatus } from "@/types";

interface BacktestDetailViewProps {
  initialRun: BacktestRun;
  strategyName: string | null;
}

export function BacktestDetailView({ initialRun, strategyName }: BacktestDetailViewProps) {
  const { run, isLive, error, refresh } = useBacktestRealtime({ initialRun });
  const config = run.config as unknown as BacktestConfig;

  const [, setTick] = useState(0);
  useEffect(() => {
    if (run.status !== "running" && run.status !== "pending") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [run.status]);

  const startedAt = run.started_at ? new Date(run.started_at) : null;
  const completedAt = run.completed_at ? new Date(run.completed_at) : null;
  const elapsed = completedAt && startedAt
    ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
    : startedAt
    ? Math.round((Date.now() - startedAt.getTime()) / 1000)
    : null;

  // Extract return % if available
  const resultsData = run.results as Record<string, unknown> | null;
  const metrics = resultsData?.metrics as Record<string, number> | null;
  const returnPct = run.status === "completed" ? metrics?.total_return_pct : undefined;
  const sharpe = run.status === "completed" ? metrics?.sharpe_ratio : undefined;

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/backtests"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">
                {config.name || "Backtest Run"}
              </h1>
              <StatusBadge status={run.status as BacktestStatus} />
            </div>
            <p className="text-2xs text-text-muted font-mono mt-0.5">{run.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-2xs text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />Refresh
          </Button>
          <Link href={`/dashboard/backtests?strategy=${run.strategy_id}`}>
            <Button variant="secondary" size="sm">
              <Play size={14} />Run Again
            </Button>
          </Link>
          {run.status === "completed" && (
            <Link href={`/dashboard/results/${run.id}`}>
              <Button size="sm">
                <BarChart3 size={14} />View Results
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Realtime error ─────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-sm text-loss flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Pending / Running ──────────────────────────────────── */}
      {(run.status === "pending" || run.status === "running") && (
        <div className="relative rounded-2xl border border-border overflow-hidden bg-surface-1">
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-3">
            <div className={cn(
              "h-full transition-all duration-1000",
              run.status === "pending"
                ? "w-[12%] bg-yellow-400"
                : "w-2/3 bg-accent animate-pulse"
            )} />
          </div>

          <div className="text-center py-12">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <Activity
                size={24}
                className={cn("text-accent", run.status === "running" && "animate-pulse")}
              />
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-1.5">
              {run.status === "pending" ? "Queued for execution" : "Backtest running…"}
            </h2>
            <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
              {run.status === "pending"
                ? "Your backtest is queued and will start shortly."
                : "Simulating trades against historical market data."}
            </p>
            {elapsed !== null && (
              <p className="text-xs text-text-muted font-mono mt-3 tabular-nums">
                {elapsed}s elapsed
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Failed ─────────────────────────────────────────────── */}
      {run.status === "failed" && (
        <div className="rounded-2xl border border-loss/20 bg-loss/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-loss/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-loss" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-loss mb-1">Backtest Failed</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {run.error_message || "An unknown error occurred."}
              </p>
              <Link
                href={`/dashboard/backtests?strategy=${run.strategy_id}`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                <Play size={13} />Try Again
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Completed ──────────────────────────────────────────── */}
      {run.status === "completed" && (
        <div className={cn(
          "rounded-2xl border overflow-hidden",
          returnPct !== undefined && returnPct >= 0
            ? "border-profit/20 shadow-[0_0_60px_-20px_rgba(34,197,94,0.12)]"
            : returnPct !== undefined
            ? "border-loss/20 shadow-[0_0_60px_-20px_rgba(239,68,68,0.12)]"
            : "border-profit/20"
        )}>
          <div className={cn(
            "grid divide-y sm:divide-y-0 sm:divide-x divide-border",
            returnPct !== undefined ? "grid-cols-1 sm:grid-cols-[2fr_1fr_1fr]" : "grid-cols-1"
          )}>
            {/* Status cell */}
            <div className={cn(
              "px-6 py-5",
              returnPct !== undefined && returnPct >= 0
                ? "bg-gradient-to-br from-profit/[0.06] via-surface-1 to-surface-1"
                : returnPct !== undefined
                ? "bg-gradient-to-br from-loss/[0.06] via-surface-1 to-surface-1"
                : "bg-surface-1"
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-profit/10 flex items-center justify-center shrink-0">
                  <BarChart3 size={16} className="text-profit" />
                </div>
                <h3 className="text-sm font-semibold text-profit">Completed</h3>
                {elapsed !== null && (
                  <span className="text-2xs font-mono text-text-muted ml-auto">
                    {elapsed}s runtime
                  </span>
                )}
              </div>
              {returnPct !== undefined ? (
                <div className="flex items-end gap-2">
                  {returnPct >= 0
                    ? <TrendingUp size={18} className={cn("mb-0.5 shrink-0", pnlColor(returnPct))} />
                    : <TrendingDown size={18} className={cn("mb-0.5 shrink-0", pnlColor(returnPct))} />}
                  <p className={cn("text-4xl font-bold font-mono tabular-nums tracking-tight leading-none", pnlColor(returnPct))}>
                    {formatPercent(returnPct)}
                  </p>
                  <p className="text-xs text-text-muted mb-1">total return</p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  Backtest completed successfully.
                </p>
              )}
              <Link
                href={`/dashboard/results/${run.id}`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                View full results →
              </Link>
            </div>

            {/* Sharpe cell (if available) */}
            {sharpe !== undefined && (
              <div className="px-6 py-5 bg-surface-1">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-3">Sharpe Ratio</p>
                <p className={cn("text-3xl font-bold font-mono tabular-nums tracking-tight", pnlColor(sharpe - 1))}>
                  {sharpe.toFixed(2)}
                </p>
              </div>
            )}

            {/* Win Rate cell (if available) */}
            {metrics?.win_rate_pct !== undefined && (
              <div className="px-6 py-5 bg-surface-1">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-3">Win Rate</p>
                <p className={cn("text-3xl font-bold font-mono tabular-nums tracking-tight", pnlColor(metrics.win_rate_pct - 50))}>
                  {metrics.win_rate_pct.toFixed(1)}%
                </p>
                <div className="mt-3 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", metrics.win_rate_pct >= 50 ? "bg-profit" : "bg-loss")}
                    style={{ width: `${metrics.win_rate_pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Configuration ──────────────────────────────────────── */}
      <div className="rounded-xl bg-surface-1 border border-border px-5 py-4">
        <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Run Configuration
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <ConfigItem label="Strategy" value={strategyName || config.strategy_id?.slice(0, 8)} />
          <ConfigItem label="Symbol" value={config.symbol} mono />
          <ConfigItem label="Interval" value={config.interval} mono />
          <ConfigItem label="Start" value={config.start || "Auto"} />
          <ConfigItem label="End" value={config.end || "Auto"} />
          <ConfigItem label="Created" value={formatDateTime(run.created_at)} />
        </div>

        {(Object.keys(config.entry || {}).length > 0 ||
          Object.keys(config.risk || {}).length > 0 ||
          Object.keys(config.params || {}).length > 0) && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
            <JsonBlock label="Entry" data={config.entry} />
            <JsonBlock label="Risk" data={config.risk} />
            <JsonBlock label="Params" data={config.params} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ConfigItem({ label, value, mono = false }: { label: string; value: string | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-2xs text-text-muted mb-0.5">{label}</p>
      <p className={cn("text-sm text-text-primary", mono && "font-mono")}>{value ?? "—"}</p>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <p className="text-2xs text-text-muted mb-1.5">{label}</p>
      <pre className="text-2xs text-text-secondary font-mono bg-surface-0 rounded-md p-2.5 border border-border overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
