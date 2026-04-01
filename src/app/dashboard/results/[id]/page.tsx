import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatPercent, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata() {
  return { title: "Backtest Results" };
}

export default async function ResultDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: run, error } = await supabase
    .from("backtest_runs")
    .select("*, strategies(name, id)")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (error || !run) {
    notFound();
  }

  const config = run.config as Record<string, unknown>;
  const strategyRef = run.strategies as Record<string, unknown> | null;
  const strategyName = (strategyRef?.name as string) || "—";

  // Read results from Supabase JSONB column (written by FastAPI backend)
  const resultsData = run.results as Record<string, unknown> | null;
  const metrics =
    run.status === "completed" && resultsData
      ? (resultsData.metrics as Record<string, number>) ??
        (resultsData as Record<string, number>)
      : null;

  const elapsed =
    run.started_at && run.completed_at
      ? Math.round(
          (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000
        )
      : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/results"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2.5">
              <span className="font-mono">{(config.symbol as string) || "—"}</span>
              Results
              <StatusBadge status={run.status as BacktestStatus} />
            </h1>
            <p className="text-2xs text-text-muted mt-0.5">
              {strategyName} · {formatDateTime(run.created_at)}
              {elapsed !== null && ` · ${elapsed}s runtime`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {strategyRef?.id && (
            <Link href={`/dashboard/strategies/${strategyRef.id}`}>
              <Button variant="ghost" size="sm">View Strategy</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Not completed yet */}
      {run.status !== "completed" && (
        <Card className="text-center py-12">
          <StatusBadge status={run.status as BacktestStatus} />
          <p className="text-sm text-text-secondary mt-4">
            {run.status === "running"
              ? "This backtest is still running. Results will appear here when it finishes."
              : run.status === "failed"
                ? `Backtest failed: ${run.error_message || "Unknown error"}`
                : "Waiting for results..."}
          </p>
          <Link href={`/dashboard/backtests/${run.id}`}>
            <Button variant="secondary" size="sm" className="mt-4">
              <RefreshCw size={14} />View Run Status
            </Button>
          </Link>
        </Card>
      )}

      {/* Metrics grid */}
      {run.status === "completed" && metrics && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Return" value={formatPercent(metrics.total_return_pct)} colorize={metrics.total_return_pct} />
            <MetricCard label="Annualized Return" value={formatPercent(metrics.annualized_return_pct)} colorize={metrics.annualized_return_pct} />
            <MetricCard label="Sharpe Ratio" value={metrics.sharpe_ratio?.toFixed(2)} colorize={metrics.sharpe_ratio} />
            <MetricCard label="Sortino Ratio" value={metrics.sortino_ratio?.toFixed(2)} colorize={metrics.sortino_ratio} />
            <MetricCard label="Max Drawdown" value={formatPercent(-Math.abs(metrics.max_drawdown_pct))} colorize={-Math.abs(metrics.max_drawdown_pct)} />
            <MetricCard label="Win Rate" value={`${metrics.win_rate_pct?.toFixed(1)}%`} />
            <MetricCard label="Profit Factor" value={metrics.profit_factor?.toFixed(2)} colorize={metrics.profit_factor - 1} />
            <MetricCard label="Total Trades" value={String(metrics.total_trades)} />
            <MetricCard label="Avg Trade Return" value={formatPercent(metrics.avg_trade_return_pct)} colorize={metrics.avg_trade_return_pct} />
            <MetricCard label="Calmar Ratio" value={metrics.calmar_ratio?.toFixed(2)} />
            <MetricCard label="Volatility" value={`${metrics.volatility_pct?.toFixed(1)}%`} />
            <MetricCard label="Max Consec. Wins" value={String(metrics.max_consecutive_wins)} />
          </div>

          <Card>
            <CardHeader><CardTitle>Equity Curve</CardTitle></CardHeader>
            <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-surface-0">
              <p className="text-sm text-text-muted">
                Equity curve chart — integrate Recharts with equity_curve data from the results column.
              </p>
            </div>
          </Card>
        </>
      )}

      {/* Completed but no metrics */}
      {run.status === "completed" && !metrics && (
        <Card className="text-center py-12">
          <p className="text-sm text-text-secondary mb-2">
            Backtest completed but no metrics found in results.
          </p>
          <p className="text-xs text-text-muted">
            The backend may store results in a different shape. Check the results JSONB column.
          </p>
        </Card>
      )}

      {/* Config */}
      <Card>
        <CardHeader><CardTitle>Run Configuration</CardTitle></CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-0.5">Symbol</p>
            <p className="font-mono text-text-primary">{config.symbol as string}</p>
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-0.5">Interval</p>
            <p className="font-mono text-text-primary">{config.interval as string}</p>
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-0.5">Period</p>
            <p className="text-text-primary">
              {(config.start as string) || "Auto"} → {(config.end as string) || "Auto"}
            </p>
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-0.5">Name</p>
            <p className="text-text-primary">{(config.name as string) || "—"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, colorize }: { label: string; value: string | undefined; colorize?: number }) {
  return (
    <Card padding="sm">
      <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-lg font-semibold font-mono tabular-nums",
        colorize !== undefined ? pnlColor(colorize) : "text-text-primary"
      )}>
        {value ?? "—"}
      </p>
    </Card>
  );
}
