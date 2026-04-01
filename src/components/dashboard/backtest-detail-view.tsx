"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, BarChart3, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useBacktestRealtime } from "@/hooks/use-backtest-realtime";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestRun, BacktestConfig, BacktestStatus } from "@/types";

interface BacktestDetailViewProps {
  initialRun: BacktestRun;
  strategyName: string | null;
}

export function BacktestDetailView({ initialRun, strategyName }: BacktestDetailViewProps) {
  const { run, isLive, error, refresh } = useBacktestRealtime({ initialRun });
  const config = run.config as unknown as BacktestConfig;

  const startedAt = run.started_at ? new Date(run.started_at) : null;
  const completedAt = run.completed_at ? new Date(run.completed_at) : null;
  const elapsed =
    startedAt && completedAt
      ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
      : startedAt
        ? Math.round((Date.now() - startedAt.getTime()) / 1000)
        : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/backtests"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2.5">
              {config.name || "Backtest Run"}
              <StatusBadge status={run.status as BacktestStatus} />
            </h1>
            <p className="text-2xs text-text-muted font-mono mt-0.5">{run.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-2xs text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />Live
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} />Refresh</Button>
          {run.status === "completed" && (
            <Link href={`/dashboard/results/${run.id}`}>
              <Button size="sm"><BarChart3 size={14} />View Results</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Realtime error */}
      {error && (
        <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-sm text-loss flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* In-progress visualization */}
      {(run.status === "pending" || run.status === "running") && (
        <Card className="relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-3">
            <div className={cn(
              "h-full transition-all duration-1000",
              run.status === "pending" ? "w-[15%] bg-yellow-400" : "w-[65%] bg-accent animate-pulse"
            )} />
          </div>
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <Activity size={24} className={cn("text-accent", run.status === "running" && "animate-pulse")} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              {run.status === "pending" ? "Queued for execution" : "Backtest running"}
            </h2>
            <p className="text-sm text-text-secondary">
              {run.status === "pending"
                ? "Your backtest is in the queue and will start shortly."
                : "Simulating trades against historical data..."}
            </p>
            {elapsed !== null && <p className="text-xs text-text-muted font-mono mt-3">Elapsed: {elapsed}s</p>}
          </div>
        </Card>
      )}

      {/* Failed */}
      {run.status === "failed" && run.error_message && (
        <Card className="border-loss/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-loss/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-loss" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-loss mb-1">Backtest Failed</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{run.error_message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Completed */}
      {run.status === "completed" && (
        <Card className="border-profit/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-profit/10 flex items-center justify-center shrink-0 mt-0.5">
              <BarChart3 size={18} className="text-profit" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-profit mb-1">Backtest Completed</h3>
              <p className="text-sm text-text-secondary">
                Finished in {elapsed !== null ? `${elapsed}s` : "—"}. View the full results.
              </p>
              <Link href={`/dashboard/results/${run.id}`}
                className="inline-flex items-center gap-1 mt-2 text-sm text-accent hover:text-accent-hover font-medium transition-colors">
                View Results →
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
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
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
            <JsonBlock label="Entry" data={config.entry} />
            <JsonBlock label="Risk" data={config.risk} />
            <JsonBlock label="Params" data={config.params} />
          </div>
        )}
      </Card>
    </div>
  );
}

function ConfigItem({ label, value, mono = false }: { label: string; value: string | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-2xs text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn("text-sm text-text-primary", mono && "font-mono")}>{value ?? "—"}</p>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <pre className="text-2xs text-text-secondary font-mono bg-surface-0 rounded-md p-2 border border-border overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
