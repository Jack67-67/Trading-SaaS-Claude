import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Sparkles, CheckCircle2, Info, AlertTriangle, XCircle, ListChecks, Database, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatPercent, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  computeConfidence,
  generateSummary,
  generateInsights,
  generateRiskLabel,
  generateWhenItWorksAndFails,
  generateWhatToDoNow,
  generateWhenToAvoid,
  generateVerdict,
} from "@/lib/ai-strategy";
import { compareTwoRuns } from "@/lib/trends";
import { RunComparisonPanel } from "@/components/dashboard/run-comparison";
import type { RiskLevel, TimeframeHorizon } from "@/lib/ai-strategy";
import type { BacktestStatus, BacktestMetrics, EquityCurvePoint } from "@/types";

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

  if (error || !run) notFound();

  // Fetch the previous completed run for the same strategy (for comparison)
  const strategyRef0 = run.strategies as Record<string, unknown> | null;
  let prevRun: { id: string; results: unknown } | null = null;
  if (strategyRef0?.id && run.completed_at) {
    const { data: prev } = await supabase
      .from("backtest_runs")
      .select("id, results")
      .eq("strategy_id", strategyRef0.id as string)
      .eq("status", "completed")
      .lt("completed_at", run.completed_at as string)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();
    if (prev) prevRun = prev as { id: string; results: unknown };
  }

  const config = run.config as Record<string, unknown>;
  const strategyRef = run.strategies as Record<string, unknown> | null;
  const strategyName = (strategyRef?.name as string) || "—";

  const resultsData = run.results as Record<string, unknown> | null;
  const metrics: BacktestMetrics | null =
    run.status === "completed" && resultsData
      ? ((resultsData.metrics as BacktestMetrics) ?? null)
      : null;
  const equityCurve: EquityCurvePoint[] =
    (resultsData?.equity_curve as EquityCurvePoint[]) ?? [];

  const elapsed =
    run.started_at && run.completed_at
      ? Math.round(
          (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000
        )
      : null;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/results"
            className="w-8 h-8 mt-0.5 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
                {(config.symbol as string) || "—"}
              </h1>
              <span className="text-text-muted font-normal text-lg">·</span>
              <span className="text-lg font-medium text-text-secondary">
                {(config.name as string) || "Backtest Run"}
              </span>
              <StatusBadge status={run.status as BacktestStatus} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted flex-wrap">
              <span>{strategyName}</span>
              <span className="w-1 h-1 rounded-full bg-border-hover" />
              <span className="font-mono">{(config.interval as string) || "—"}</span>
              {elapsed !== null && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border-hover" />
                  <span>{elapsed}s runtime</span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-border-hover" />
              <span>{formatDateTime(run.created_at)}</span>
              <span className="w-1 h-1 rounded-full bg-border-hover" />
              <span className="inline-flex items-center gap-1 text-accent font-medium">
                <Database size={10} />
                Real market data · Polygon
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!!strategyRef?.id && (
            <Link href={`/dashboard/strategies/${strategyRef.id as string}`}>
              <Button variant="ghost" size="sm">View Strategy</Button>
            </Link>
          )}
          <Link href={`/dashboard/backtests/${run.id}`}>
            <Button variant="ghost" size="sm">
              <RefreshCw size={14} />Run Status
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Not yet completed ─────────────────────────────────── */}
      {run.status !== "completed" && (
        <Card className="text-center py-12">
          <StatusBadge status={run.status as BacktestStatus} />
          <p className="text-sm text-text-secondary mt-4 mb-4">
            {run.status === "running"
              ? "This backtest is still running. Results will appear here when it finishes."
              : run.status === "failed"
                ? `Backtest failed: ${run.error_message || "Unknown error"}`
                : "Waiting for the backtest to start…"}
          </p>
          <Link href={`/dashboard/backtests/${run.id}`}>
            <Button variant="secondary" size="sm">
              <RefreshCw size={14} />View Live Status
            </Button>
          </Link>
        </Card>
      )}

      {/* ── Completed but no metrics ──────────────────────────── */}
      {run.status === "completed" && !metrics && (
        <Card className="text-center py-12">
          <p className="text-sm text-text-secondary mb-1">
            Backtest completed but no metrics were returned.
          </p>
          <p className="text-xs text-text-muted">
            Check that your backend writes a <code className="font-mono">metrics</code> object into the results column.
          </p>
        </Card>
      )}

      {/* ── Results ─────────────────────────────────────────────── */}
      {metrics && (() => {
        // Compute comparison with previous run
        const prevMetrics = prevRun
          ? ((prevRun.results as Record<string, unknown> | null)?.metrics as BacktestMetrics | null) ?? null
          : null;
        const comparison = prevMetrics
          ? compareTwoRuns(
              { returnPct: metrics.total_return_pct, sharpe: metrics.sharpe_ratio, drawdown: Math.abs(metrics.max_drawdown_pct), winRate: metrics.win_rate_pct, trades: metrics.total_trades },
              { returnPct: prevMetrics.total_return_pct, sharpe: prevMetrics.sharpe_ratio, drawdown: Math.abs(prevMetrics.max_drawdown_pct), winRate: prevMetrics.win_rate_pct, trades: prevMetrics.total_trades }
            )
          : null;

        const verdict = generateVerdict(metrics);

        return (
        <>
          {/* Verdict banner — strategy quality at a glance */}
          <VerdictBanner verdict={verdict} />

          {/* KPI hero — unified card */}
          <KpiHero metrics={metrics} />

          {/* Benchmark comparison */}
          {metrics.buy_and_hold_return_pct !== undefined && (
            <BenchmarkBar
              strategyReturn={metrics.total_return_pct}
              buyAndHoldReturn={metrics.buy_and_hold_return_pct}
              symbol={(config.symbol as string) || "asset"}
            />
          )}

          {/* Comparison vs previous run */}
          {comparison && (
            <RunComparisonPanel comparison={comparison} prevRunId={prevRun?.id} />
          )}

          {/* AI Analysis panel */}
          <AiAnalysisPanel
            metrics={metrics}
            risk={(config.ai_risk as RiskLevel) || undefined}
            timeframe={(config.ai_timeframe as TimeframeHorizon) || undefined}
            symbol={(config.symbol as string) || undefined}
          />

          {/* Equity curve */}
          {equityCurve.length >= 2 && (
            <EquityChartCard data={equityCurve} periods={equityCurve.length} />
          )}

          {/* Metric groups */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricGroup
              title="Performance"
              accent="bg-accent"
              rows={[
                { label: "Total Return", value: formatPercent(metrics.total_return_pct), numeric: metrics.total_return_pct },
                { label: "Annualized Return", value: formatPercent(metrics.annualized_return_pct), numeric: metrics.annualized_return_pct },
                { label: "Sharpe Ratio", value: metrics.sharpe_ratio.toFixed(2), numeric: metrics.sharpe_ratio - 1, tag: sharpeLabel(metrics.sharpe_ratio) },
                { label: "Sortino Ratio", value: metrics.sortino_ratio.toFixed(2), numeric: metrics.sortino_ratio - 1 },
                { label: "Calmar Ratio", value: metrics.calmar_ratio.toFixed(2), numeric: metrics.calmar_ratio - 1 },
              ]}
            />
            <MetricGroup
              title="Risk"
              accent="bg-yellow-500"
              rows={[
                {
                  label: "Max Drawdown",
                  value: formatPercent(-Math.abs(metrics.max_drawdown_pct)),
                  numeric: -Math.abs(metrics.max_drawdown_pct),
                  bar: { fill: Math.min(Math.abs(metrics.max_drawdown_pct) / 50, 1), color: "loss" },
                },
                { label: "Volatility (ann.)", value: `${metrics.volatility_pct.toFixed(1)}%` },
                { label: "Profit Factor", value: metrics.profit_factor.toFixed(2), numeric: metrics.profit_factor - 1 },
                { label: "Avg Trade Return", value: formatPercent(metrics.avg_trade_return_pct), numeric: metrics.avg_trade_return_pct },
              ]}
            />
            <MetricGroup
              title="Trades"
              accent="bg-violet-500"
              rows={[
                { label: "Total Trades", value: String(metrics.total_trades) },
                {
                  label: "Win Rate",
                  value: `${metrics.win_rate_pct.toFixed(1)}%`,
                  numeric: metrics.win_rate_pct - 50,
                  bar: { fill: metrics.win_rate_pct / 100, color: metrics.win_rate_pct >= 50 ? "profit" : "loss" },
                },
                { label: "Max Consec. Wins", value: String(metrics.max_consecutive_wins) },
                { label: "Max Consec. Losses", value: String(metrics.max_consecutive_losses) },
              ]}
            />
          </div>

          {/* Run Configuration — compact metadata footer */}
          <div className="rounded-xl bg-surface-1 border border-border px-5 py-4">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              Run Configuration
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2.5">
              <ConfigItem label="Symbol" value={(config.symbol as string) || "—"} mono />
              <ConfigItem label="Interval" value={(config.interval as string) || "—"} mono />
              <ConfigItem
                label="Period"
                value={`${(config.start as string) || "Auto"} → ${(config.end as string) || "Auto"}`}
              />
              <ConfigItem label="Name" value={(config.name as string) || "—"} />
              <ConfigItem label="Run ID" value={run.id.slice(0, 8) + "…"} mono />
            </div>
          </div>
        </>
        );
      })()}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

import type { VerdictResult } from "@/lib/ai-strategy";

function VerdictBanner({ verdict }: { verdict: VerdictResult }) {
  const colorMap = {
    profit: {
      border: "border-profit/20",
      bg: "from-profit/[0.06] via-surface-1 to-surface-1",
      badge: "bg-profit/10 text-profit border-profit/20",
      dot: "bg-profit",
      labelColor: "text-profit",
    },
    accent: {
      border: "border-accent/20",
      bg: "from-accent/[0.06] via-surface-1 to-surface-1",
      badge: "bg-accent/10 text-accent border-accent/20",
      dot: "bg-accent",
      labelColor: "text-accent",
    },
    amber: {
      border: "border-amber-400/25",
      bg: "from-amber-400/[0.05] via-surface-1 to-surface-1",
      badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
      dot: "bg-amber-400",
      labelColor: "text-amber-400",
    },
    loss: {
      border: "border-loss/20",
      bg: "from-loss/[0.05] via-surface-1 to-surface-1",
      badge: "bg-loss/10 text-loss border-loss/20",
      dot: "bg-loss",
      labelColor: "text-loss",
    },
  };
  const s = colorMap[verdict.color];

  return (
    <div className={cn("rounded-2xl border overflow-hidden bg-gradient-to-br", s.border, s.bg)}>
      {/* Top row: verdict label + tagline pill */}
      <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot)} />
          <div>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-0.5">
              Strategy Verdict
            </p>
            <p className={cn("text-lg font-bold leading-snug", s.labelColor)}>
              {verdict.label}
            </p>
          </div>
        </div>
        <span className={cn("text-xs font-semibold border rounded-full px-3 py-1 shrink-0", s.badge)}>
          {verdict.tagline}
        </span>
      </div>

      {/* TL;DR — the most important line, always visible */}
      <div className={cn("px-6 py-3 border-t border-border/50 bg-surface-1/60")}>
        <p className="text-sm font-semibold text-text-primary leading-snug">
          {verdict.tldr}
        </p>
      </div>

      {/* Explanation — fuller context */}
      <div className="px-6 py-3 border-t border-border/40 bg-surface-1/30">
        <p className="text-xs text-text-muted leading-relaxed">{verdict.explanation}</p>
      </div>
    </div>
  );
}

function BenchmarkBar({
  strategyReturn,
  buyAndHoldReturn,
  symbol,
}: {
  strategyReturn: number;
  buyAndHoldReturn: number;
  symbol: string;
}) {
  const delta = strategyReturn - buyAndHoldReturn;
  const beats = delta > 0;
  const isFlat = Math.abs(delta) < 0.5;

  return (
    <div className="rounded-xl border border-border bg-surface-1 px-5 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Label */}
        <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest shrink-0">
          vs Buy &amp; Hold · {symbol}
        </p>

        {/* Strategy vs benchmark numbers */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-2xs text-text-muted mb-1">Strategy</p>
            <p className={cn("text-base font-bold font-mono tabular-nums", pnlColor(strategyReturn))}>
              {strategyReturn >= 0 ? "+" : ""}{strategyReturn.toFixed(1)}%
            </p>
          </div>
          <div className="text-text-muted text-sm">vs</div>
          <div className="text-center">
            <p className="text-2xs text-text-muted mb-1">Buy &amp; Hold</p>
            <p className={cn("text-base font-bold font-mono tabular-nums", pnlColor(buyAndHoldReturn))}>
              {buyAndHoldReturn >= 0 ? "+" : ""}{buyAndHoldReturn.toFixed(1)}%
            </p>
          </div>
          <div className={cn(
            "text-xs font-semibold border rounded-full px-3 py-1 shrink-0",
            isFlat
              ? "bg-surface-2 border-border text-text-muted"
              : beats
                ? "bg-profit/10 border-profit/20 text-profit"
                : "bg-loss/10 border-loss/20 text-loss"
          )}>
            {isFlat
              ? "In line with benchmark"
              : beats
                ? `+${delta.toFixed(1)}pp above benchmark`
                : `${delta.toFixed(1)}pp below benchmark`}
          </div>
        </div>
      </div>

      {/* Context line */}
      <p className="text-xs text-text-muted mt-3 leading-relaxed">
        {isFlat
          ? "The strategy returned roughly the same as simply holding the asset — no meaningful alpha generated."
          : beats
            ? "The strategy outperformed buy-and-hold. Confirm this holds on a different date range before treating it as reliable edge."
            : "The strategy underperformed buy-and-hold. More risk was taken for a lower return than simply holding the asset."}
      </p>
    </div>
  );
}

function sharpeLabel(v: number): { text: string; cls: string } {
  if (v >= 2)   return { text: "Excellent", cls: "text-profit" };
  if (v >= 1.5) return { text: "Very Good", cls: "text-profit" };
  if (v >= 1)   return { text: "Good",      cls: "text-accent" };
  if (v >= 0.5) return { text: "Fair",      cls: "text-yellow-400" };
  return           { text: "Poor",      cls: "text-loss" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiHero({ metrics }: { metrics: BacktestMetrics }) {
  const isUp = metrics.total_return_pct >= 0;
  const { text: sText, cls: sCls } = sharpeLabel(metrics.sharpe_ratio);
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isUp
        ? "border-profit/20 shadow-[0_0_80px_-20px_rgba(34,197,94,0.18)]"
        : "border-loss/20 shadow-[0_0_80px_-20px_rgba(239,68,68,0.18)]"
    )}>
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">

        {/* Total Return — the hero number */}
        <div className={cn(
          "px-7 py-6 relative overflow-hidden",
          isUp ? "bg-gradient-to-br from-profit/[0.06] via-surface-1 to-surface-1"
               : "bg-gradient-to-br from-loss/[0.06] via-surface-1 to-surface-1"
        )}>
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            Total Return
          </p>
          <div className="flex items-end gap-3">
            <p className={cn(
              "text-5xl font-bold font-mono tabular-nums tracking-tight leading-none",
              pnlColor(metrics.total_return_pct)
            )}>
              {formatPercent(metrics.total_return_pct)}
            </p>
            <TrendIcon size={20} className={cn("mb-1.5 shrink-0", pnlColor(metrics.total_return_pct))} />
          </div>
          <p className="text-xs text-text-muted font-mono mt-3">
            {formatPercent(metrics.annualized_return_pct)} annualized
          </p>
        </div>

        {/* Sharpe Ratio */}
        <div className="px-6 py-6 bg-surface-1">
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            Sharpe Ratio
          </p>
          <p className={cn(
            "text-4xl font-bold font-mono tabular-nums tracking-tight leading-none",
            pnlColor(metrics.sharpe_ratio - 1)
          )}>
            {metrics.sharpe_ratio.toFixed(2)}
          </p>
          <p className={cn("text-xs mt-3 font-semibold flex items-center gap-1.5", sCls)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {sText}
          </p>
        </div>

        {/* Win Rate */}
        <div className="px-6 py-6 bg-surface-1">
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            Win Rate
          </p>
          <p className={cn(
            "text-4xl font-bold font-mono tabular-nums tracking-tight leading-none",
            metrics.total_trades < 10 ? "text-text-muted" : pnlColor(metrics.win_rate_pct - 50)
          )}>
            {metrics.total_trades === 0 ? "—" : `${metrics.win_rate_pct.toFixed(1)}%`}
          </p>
          <div className="mt-3.5 space-y-1.5">
            <div className="flex justify-between text-2xs text-text-muted font-mono">
              <span className="font-semibold text-text-secondary">{metrics.total_trades} trades</span>
              {metrics.total_trades > 0 && (
                <span>{Math.round(metrics.total_trades * metrics.win_rate_pct / 100)} wins</span>
              )}
            </div>
            {metrics.total_trades > 0 && (
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", metrics.total_trades < 10 ? "bg-text-muted/40" : metrics.win_rate_pct >= 50 ? "bg-profit" : "bg-loss")}
                  style={{ width: `${metrics.win_rate_pct}%` }}
                />
              </div>
            )}
            {metrics.total_trades < 10 && metrics.total_trades > 0 && (
              <p className="text-2xs text-amber-400 flex items-center gap-1 pt-0.5">
                <TriangleAlert size={9} />
                Low sample — win rate unreliable
              </p>
            )}
            {metrics.total_trades === 0 && (
              <p className="text-2xs text-loss flex items-center gap-1 pt-0.5">
                <TriangleAlert size={9} />
                No trades executed
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function EquityChartCard({ data, periods }: { data: EquityCurvePoint[]; periods: number }) {
  const equities = data.map((d) => d.equity);
  const first = equities[0];
  const last = equities[equities.length - 1];
  const isUp = last >= first;

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-surface-1">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Equity Curve</h3>
          <p className="text-xs text-text-muted mt-0.5">{periods} periods simulated</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-text-muted">
            ${first.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
          <span className="text-text-muted">→</span>
          <span className={cn("font-semibold", pnlColor(last - first))}>
            ${last.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
          <span className={cn("font-semibold", pnlColor(last - first))}>
            ({formatPercent((last / first - 1) * 100)})
          </span>
        </div>
      </div>
      <EquityChart data={data} />
    </div>
  );
}

function MetricGroup({
  title, accent, rows,
}: {
  title: string;
  accent: string;
  rows: {
    label: string;
    value: string | undefined;
    numeric?: number;
    tag?: { text: string; cls: string };
    bar?: { fill: number; color: "profit" | "loss" | "neutral" };
  }[];
}) {
  return (
    <div className="rounded-xl bg-surface-1 border border-border p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className={cn("w-1 h-4 rounded-full shrink-0", accent)} />
        <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">{title}</p>
      </div>
      <div className="space-y-4">
        {rows.map(({ label, value, numeric, tag, bar }) => (
          <div key={label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-text-muted shrink-0">{label}</span>
              <div className="flex items-baseline gap-2 min-w-0">
                {tag && (
                  <span className={cn("text-2xs font-semibold shrink-0", tag.cls)}>{tag.text}</span>
                )}
                <span className={cn(
                  "text-sm font-mono font-semibold tabular-nums",
                  numeric !== undefined ? pnlColor(numeric) : "text-text-primary"
                )}>
                  {value ?? "—"}
                </span>
              </div>
            </div>
            {bar && (
              <div className="mt-2 h-1 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    bar.color === "profit" ? "bg-profit/60"
                    : bar.color === "loss" ? "bg-loss/60"
                    : "bg-accent/60"
                  )}
                  style={{ width: `${Math.round(bar.fill * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-2xs text-text-muted mb-0.5">{label}</p>
      <p className={cn("text-xs text-text-secondary", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function AiAnalysisPanel({
  metrics,
  risk,
  timeframe,
  symbol,
}: {
  metrics: BacktestMetrics;
  risk?: RiskLevel;
  timeframe?: TimeframeHorizon;
  symbol?: string;
}) {
  const confidence  = computeConfidence(metrics);
  const summary     = generateSummary(metrics, { risk, timeframe, symbol });
  const insights    = generateInsights(metrics, risk ?? "balanced", timeframe ?? "medium");
  const riskLabel   = generateRiskLabel(metrics);
  const conditions  = generateWhenItWorksAndFails(metrics, risk, timeframe);
  const steps       = generateWhatToDoNow(metrics, risk, timeframe);
  const avoidList   = generateWhenToAvoid(metrics, risk, timeframe);

  // ── Style maps ────────────────────────────────────────────────────────────

  const confCard = {
    good:    "border-profit/20 bg-profit/[0.03]",
    neutral: "border-accent/20 bg-accent/[0.03]",
    risky:   "border-yellow-400/20 bg-yellow-400/[0.03]",
  }[confidence.level];

  const confBar = {
    good:    "bg-profit",
    neutral: "bg-accent",
    risky:   "bg-yellow-400",
  }[confidence.level];

  const confText = {
    good:    "text-profit",
    neutral: "text-accent",
    risky:   "text-yellow-400",
  }[confidence.level];

  const confIcon = {
    good:    <CheckCircle2 size={13} className="text-profit shrink-0" />,
    neutral: <Info         size={13} className="text-accent shrink-0" />,
    risky:   <AlertTriangle size={13} className="text-yellow-400 shrink-0" />,
  }[confidence.level];

  const riskBadgeCls = {
    low:    "bg-profit/10 text-profit border-profit/20",
    medium: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    high:   "bg-loss/10 text-loss border-loss/20",
  }[riskLabel.level];

  const insightStyle = {
    positive: { icon: <CheckCircle2 size={13} className="text-profit shrink-0 mt-0.5" />, wrap: "border-profit/10 bg-profit/[0.03]" },
    neutral:  { icon: <Info          size={13} className="text-accent shrink-0 mt-0.5" />, wrap: "border-border bg-surface-2" },
    warning:  { icon: <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />, wrap: "border-yellow-400/10 bg-yellow-400/[0.02]" },
  };

  return (
    <div className={cn("rounded-2xl border px-6 py-5 space-y-5", confCard)}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <p className="text-sm font-semibold text-text-primary">AI Analysis</p>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", riskBadgeCls)}>
          {riskLabel.label}
        </span>
      </div>

      {/* ── Confidence score bar ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-surface-2 border border-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
            Confidence Score
          </p>
          <div className="flex items-center gap-1.5">
            {confIcon}
            <span className={cn("text-xs font-semibold", confText)}>{confidence.label}</span>
            <span className="text-lg font-bold font-mono text-text-primary leading-none">
              {confidence.score}
              <span className="text-xs font-normal text-text-muted">/100</span>
            </span>
          </div>
        </div>
        {/* Bar */}
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", confBar)}
            style={{ width: `${confidence.score}%` }}
          />
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{confidence.reason}</p>
        <p className="text-xs text-text-secondary leading-relaxed border-t border-border/60 pt-2 mt-1">
          {confidence.explanation}
        </p>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>

      {/* ── When it works / When it fails ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-profit/10 bg-profit/[0.02] px-4 py-3">
          <p className="text-2xs font-semibold text-profit uppercase tracking-wider mb-1.5">
            When it works
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">{conditions.works}</p>
        </div>
        <div className="rounded-xl border border-loss/10 bg-loss/[0.02] px-4 py-3">
          <p className="text-2xs font-semibold text-loss uppercase tracking-wider mb-1.5">
            When it struggles
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">{conditions.fails}</p>
        </div>
      </div>

      {/* ── When to avoid ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-loss/15 bg-loss/[0.015] px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <XCircle size={12} className="text-loss/70 shrink-0" />
          <p className="text-2xs font-semibold text-loss/80 uppercase tracking-wider">
            When to avoid
          </p>
        </div>
        <div className="space-y-2">
          {avoidList.map((cond, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-loss/50 shrink-0" />
              <p className="text-xs text-text-muted leading-relaxed">{cond}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Key Insights ─────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Key Insights</p>
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const s = insightStyle[insight.type];
            return (
              <div key={i} className={cn("rounded-xl border px-4 py-3", s.wrap)}>
                <div className="flex items-start gap-2.5">
                  {s.icon}
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">{insight.title}</p>
                    <p className="text-xs text-text-muted leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── What to do now ───────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ListChecks size={13} className="text-accent shrink-0" />
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
            What to do now
          </p>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-surface-2 border border-border px-4 py-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-surface-0 text-2xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-text-secondary leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function EquityChart({ data }: { data: EquityCurvePoint[] }) {
  const W = 1000, H = 200, PY = 14;
  const equities = data.map((d) => d.equity);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const range = max - min || 1;

  const px = (i: number) => (i / (data.length - 1)) * W;
  const py = (v: number) => H - PY - ((v - min) / range) * (H - PY * 2);

  const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(d.equity).toFixed(1)}`);
  const linePts = pts.join(" ");
  const areaPts = `0,${H} ${linePts} ${W},${H}`;

  const isUp = equities[equities.length - 1] >= equities[0];
  const stroke = isUp ? "#22c55e" : "#ef4444";

  // Grid lines at 25 / 50 / 75 %
  const gridYs = [0.25, 0.5, 0.75].map((t) => py(min + t * range));

  // Break-even line (starting equity level)
  const breakEvenY = py(equities[0]);

  const x0 = px(0), y0 = py(equities[0]);
  const xN = px(data.length - 1), yN = py(equities[data.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 200 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="equity-area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="80%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle grid lines */}
      {gridYs.map((y, i) => (
        <line key={i}
          x1={0} y1={y.toFixed(1)} x2={W} y2={y.toFixed(1)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        />
      ))}

      {/* Break-even dashed line */}
      <line
        x1={0} y1={breakEvenY.toFixed(1)} x2={W} y2={breakEvenY.toFixed(1)}
        stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="6 5"
      />

      {/* Gradient area fill */}
      <polygon points={areaPts} fill="url(#equity-area-gradient)" />

      {/* Main price line */}
      <polyline
        points={linePts}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Start dot */}
      <circle cx={x0.toFixed(1)} cy={y0.toFixed(1)} r="3" fill="rgba(255,255,255,0.3)" />

      {/* End dot — outer glow ring + solid center */}
      <circle cx={xN.toFixed(1)} cy={yN.toFixed(1)} r="7" fill={stroke} fillOpacity="0.15" />
      <circle cx={xN.toFixed(1)} cy={yN.toFixed(1)} r="4" fill={stroke} />
    </svg>
  );
}
