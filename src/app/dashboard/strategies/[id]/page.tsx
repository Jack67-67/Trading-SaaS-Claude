import { notFound } from "next/navigation";
import Link from "next/link";
import { Play, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StrategyForm } from "@/components/dashboard/strategy-form";
import { AiAlerts } from "@/components/dashboard/ai-alerts";
import { TrendBadge, RunComparisonPanel } from "@/components/dashboard/run-comparison";
import { StrategyRunHistory } from "@/components/dashboard/strategy-run-history";
import type { StrategyRunRow } from "@/components/dashboard/strategy-run-history";
import { RerunButton } from "@/components/dashboard/rerun-button";
import { generateAlerts } from "@/lib/alerts";
import { computeStrategyTrend, compareTwoRuns } from "@/lib/trends";
import { formatPercent, pnlColor, cn } from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from("strategies")
    .select("name")
    .eq("id", params.id)
    .single();

  return { title: data?.name ?? "Edit Strategy" };
}

export default async function StrategyEditorPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: strategy, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (error || !strategy) {
    notFound();
  }

  // Fetch completed runs for this strategy
  const { data: strategyRuns } = await supabase
    .from("backtest_runs")
    .select("id, results, completed_at, started_at, config")
    .eq("strategy_id", params.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

  // Build typed run rows for StrategyRunHistory
  const runRows: StrategyRunRow[] = (strategyRuns ?? []).flatMap((r) => {
    const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
    const cfg = r.config as Record<string, unknown> | null;
    if (!m || m.total_return_pct === undefined) return [];
    return [{
      id: r.id as string,
      name: (cfg?.name as string) || (cfg?.symbol as string) || "Run",
      symbol: (cfg?.symbol as string) || "—",
      interval: (cfg?.interval as string) || "—",
      completedAt: (r.completed_at as string) || (r.started_at as string) || new Date().toISOString(),
      returnPct: m.total_return_pct,
      sharpe: m.sharpe_ratio ?? 0,
      drawdown: Math.abs(m.max_drawdown_pct ?? 0),
      winRate: m.win_rate_pct ?? 0,
      trades: m.total_trades ?? 0,
    }];
  });

  // Alerts + trend from same data
  const alertInputs = runRows.map((r) => ({
    id: r.id,
    strategyId: params.id,
    strategyName: strategy.name,
    symbol: r.symbol,
    completedAt: r.completedAt,
    returnPct: r.returnPct,
    sharpe: r.sharpe,
    drawdown: r.drawdown,
    trades: r.trades,
    winRate: r.winRate,
  }));
  const strategyAlerts = generateAlerts(alertInputs);
  const trend = computeStrategyTrend(
    runRows.map((r) => ({
      returnPct: r.returnPct,
      sharpe: r.sharpe,
      drawdown: r.drawdown,
      winRate: r.winRate,
      trades: r.trades,
    }))
  );

  // Last 2 runs for comparison
  const latestRun = runRows.length > 0 ? runRows[runRows.length - 1] : null;
  const prevRun   = runRows.length > 1 ? runRows[runRows.length - 2] : null;
  const comparison = latestRun && prevRun
    ? compareTwoRuns(
        { returnPct: latestRun.returnPct, sharpe: latestRun.sharpe, drawdown: latestRun.drawdown, winRate: latestRun.winRate, trades: latestRun.trades },
        { returnPct: prevRun.returnPct,   sharpe: prevRun.sharpe,   drawdown: prevRun.drawdown,   winRate: prevRun.winRate,   trades: prevRun.trades }
      )
    : null;

  // Last run's config (for "Run again" link pre-fill)
  const lastRunRecord = latestRun
    ? (strategyRuns ?? []).find((r) => r.id === latestRun.id)
    : null;
  const lastRunConfig = lastRunRecord?.config as Record<string, unknown> | null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {(strategy as Record<string, unknown> & { name?: string }).name ?? "Strategy"}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {runRows.length > 0
              ? `${runRows.length} completed ${runRows.length === 1 ? "run" : "runs"}`
              : "No completed runs yet"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trend && <TrendBadge trend={trend} />}
          <Link
            href={`/dashboard/backtests?strategy=${params.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            <Play size={14} />
            Run Backtest
          </Link>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {strategyAlerts.length > 0 && (
        <AiAlerts alerts={strategyAlerts} variant="compact" />
      )}

      {/* ── Last Run + Rerun ─────────────────────────────────────── */}
      {latestRun && (
        <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
            <p className="text-xs font-semibold text-text-primary">Last Run</p>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/backtests?strategy=${params.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <Play size={11} />
                New run
              </Link>
              <RerunButton runId={latestRun.id} />
            </div>
          </div>

          <div className="px-5 py-4 flex items-start gap-6 flex-wrap">
            {/* Config snapshot */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-text-primary bg-surface-3 border border-border rounded px-2 py-1">
                {latestRun.symbol}
              </span>
              <span className="text-xs font-mono text-text-muted bg-surface-3 border border-border rounded px-2 py-1">
                {latestRun.interval}
              </span>
              {typeof lastRunConfig?.start === "string" && (
                <span className="text-2xs text-text-muted font-mono">
                  {lastRunConfig.start.slice(0, 10)}
                  {typeof lastRunConfig.end === "string"
                    ? ` → ${lastRunConfig.end.slice(0, 10)}`
                    : " → now"}
                </span>
              )}
            </div>

            {/* Key metrics */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-right">
                <p className="text-2xs text-text-muted mb-0.5">Return</p>
                <p className={cn("text-base font-bold font-mono tabular-nums", pnlColor(latestRun.returnPct))}>
                  {formatPercent(latestRun.returnPct)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xs text-text-muted mb-0.5">Sharpe</p>
                <p className={cn(
                  "text-base font-bold font-mono tabular-nums",
                  pnlColor(latestRun.sharpe - 1)
                )}>
                  {latestRun.sharpe.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xs text-text-muted mb-0.5">Win Rate</p>
                <p className="text-base font-bold font-mono tabular-nums text-text-primary">
                  {latestRun.winRate.toFixed(1)}%
                </p>
              </div>
              <Link
                href={`/dashboard/results/${latestRun.id}`}
                className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1 shrink-0"
              >
                View results →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Comparison vs previous run ───────────────────────────── */}
      {comparison && (
        <RunComparisonPanel comparison={comparison} prevRunId={prevRun?.id} />
      )}

      {/* ── Performance history ─────────────────────────────────── */}
      <StrategyRunHistory runs={runRows} strategyId={params.id} />

      {/* ── Strategy editor ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Strategy Code
        </p>
        <StrategyForm
          mode="edit"
          strategyId={strategy.id}
          initialData={{
            name: strategy.name,
            description: strategy.description,
            code: strategy.code,
          }}
        />
      </div>
    </div>
  );
}
