import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, ArrowRight, Play,
  TriangleAlert, ShieldCheck, Layers2, Activity,
  CircleCheck, CircleMinus, CircleX, CircleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateVerdict, generateRiskLabel, computeConfidence } from "@/lib/ai-strategy";
import { generateAlerts } from "@/lib/alerts";
import { computeStrategyTrend, compareTwoRuns } from "@/lib/trends";
import { formatPercent, pnlColor, cn } from "@/lib/utils";
import type { BacktestMetrics } from "@/types";
import type { TrendLabel } from "@/lib/trends";
import type { AppAlert } from "@/lib/alerts";

export const metadata: Metadata = { title: "Portfolio" };

// ── Types ───────────────────────────────────────────────────────────────────

interface StrategyRow {
  id: string;
  name: string;
  description: string | null;
  hasRuns: boolean;
  latestRunId: string | null;
  metrics: BacktestMetrics | null;
  trend: TrendLabel | null;
  alerts: AppAlert[];
  lastSymbol: string | null;
  runCount: number;
}

// ── Health badge ────────────────────────────────────────────────────────────

type HealthLevel = "healthy" | "mixed" | "at-risk" | "critical" | "no-data";

function portfolioHealth(rows: StrategyRow[]): HealthLevel {
  const analyzed = rows.filter((r) => r.metrics);
  if (analyzed.length === 0) return "no-data";
  const critical = rows.flatMap((r) => r.alerts).filter((a) => a.severity === "critical").length;
  if (critical > 0) return "critical";
  const atRisk = analyzed.filter((r) => r.trend === "at-risk" || r.trend === "declining").length;
  if (atRisk > analyzed.length / 2) return "at-risk";
  const hasWarnings = rows.flatMap((r) => r.alerts).some((a) => a.severity === "warning") || atRisk > 0;
  if (hasWarnings) return "mixed";
  return "healthy";
}

const HEALTH_CONFIG: Record<HealthLevel, { label: string; icon: React.ReactNode; cls: string; bg: string }> = {
  healthy:  { label: "Healthy",        icon: <CircleCheck  size={13} />, cls: "text-profit",     bg: "bg-profit/10 border-profit/20" },
  mixed:    { label: "Mixed",          icon: <CircleMinus  size={13} />, cls: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/20" },
  "at-risk":{ label: "Needs Attention",icon: <CircleAlert  size={13} />, cls: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  critical: { label: "Critical Issues",icon: <CircleX      size={13} />, cls: "text-loss",       bg: "bg-loss/10 border-loss/20" },
  "no-data":{ label: "No Data Yet",    icon: <CircleMinus  size={13} />, cls: "text-text-muted",  bg: "bg-surface-3 border-border" },
};

// ── Trend display ────────────────────────────────────────────────────────────

const TREND_CONFIG: Record<TrendLabel, { icon: React.ReactNode; label: string; cls: string }> = {
  improving: { icon: <TrendingUp  size={13} />, label: "Improving", cls: "text-profit" },
  stable:    { icon: <Minus       size={13} />, label: "Stable",    cls: "text-text-muted" },
  "at-risk": { icon: <TriangleAlert size={12} />, label: "At-risk",  cls: "text-yellow-400" },
  declining: { icon: <TrendingDown size={13} />, label: "Declining", cls: "text-loss" },
};

// ── Verdict color map ────────────────────────────────────────────────────────

const VERDICT_CLS: Record<string, string> = {
  profit: "text-profit bg-profit/10 border-profit/20",
  accent: "text-accent bg-accent/10 border-accent/20",
  amber:  "text-amber-400 bg-amber-400/10 border-amber-400/20",
  loss:   "text-loss bg-loss/10 border-loss/20",
};

// ── Risk badge ───────────────────────────────────────────────────────────────

const RISK_CLS: Record<string, string> = {
  low:    "text-profit bg-profit/10 border-profit/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  high:   "text-loss bg-loss/10 border-loss/20",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: strategies } = await supabase
    .from("strategies")
    .select("id, name, description, backtest_runs(id, status, results, completed_at, config)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  // ── Build per-strategy rows ─────────────────────────────────────────────

  const rows: StrategyRow[] = (strategies ?? []).map((s) => {
    type RunEntry = {
      id: string;
      status: string;
      results: unknown;
      completed_at: string | null;
      config: unknown;
    };
    const allRuns = (
      (s as Record<string, unknown> & { backtest_runs?: RunEntry[] }).backtest_runs ?? []
    );
    const completed = allRuns
      .filter((r) => r.status === "completed" && r.results)
      .sort(
        (a, b) =>
          new Date(a.completed_at ?? "").getTime() -
          new Date(b.completed_at ?? "").getTime()
      );

    const latestRun = completed[completed.length - 1] ?? null;
    const latestMetrics = latestRun
      ? ((latestRun.results as Record<string, unknown>)?.metrics as BacktestMetrics | null) ?? null
      : null;
    const lastSymbol = latestRun
      ? ((latestRun.config as Record<string, unknown>)?.symbol as string) ?? null
      : null;

    // Trend from last 2 runs
    const snapshots = completed.flatMap((r) => {
      const m = (r.results as Record<string, unknown>)?.metrics as BacktestMetrics | null;
      if (!m) return [];
      return [{
        returnPct: m.total_return_pct,
        sharpe: m.sharpe_ratio ?? 0,
        drawdown: Math.abs(m.max_drawdown_pct ?? 0),
        winRate: m.win_rate_pct ?? 0,
        trades: m.total_trades ?? 0,
      }];
    });
    const trend = computeStrategyTrend(snapshots);

    // Alerts
    const alertInputs = completed.flatMap((r) => {
      const m = (r.results as Record<string, unknown>)?.metrics as BacktestMetrics | null;
      const cfg = r.config as Record<string, unknown> | null;
      if (!m) return [];
      return [{
        id: r.id,
        strategyId: s.id as string,
        strategyName: s.name as string,
        symbol: (cfg?.symbol as string) || "—",
        completedAt: r.completed_at || new Date().toISOString(),
        returnPct: m.total_return_pct,
        sharpe: m.sharpe_ratio ?? 0,
        drawdown: Math.abs(m.max_drawdown_pct ?? 0),
        trades: m.total_trades ?? 0,
        winRate: m.win_rate_pct ?? 0,
      }];
    });
    const alerts = generateAlerts(alertInputs);

    return {
      id: s.id as string,
      name: s.name as string,
      description: (s.description as string | null) ?? null,
      hasRuns: completed.length > 0,
      latestRunId: latestRun?.id ?? null,
      metrics: latestMetrics,
      trend,
      alerts,
      lastSymbol,
      runCount: completed.length,
    };
  });

  // ── Portfolio-level stats ───────────────────────────────────────────────

  const analyzed = rows.filter((r) => r.metrics !== null);
  const returns = analyzed.map((r) => r.metrics!.total_return_pct);
  const sharpes = analyzed.map((r) => r.metrics!.sharpe_ratio ?? 0);

  const avgReturn  = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
  const avgSharpe  = sharpes.length ? sharpes.reduce((a, b) => a + b, 0) / sharpes.length : null;
  const bestRow    = analyzed.length ? analyzed.reduce((a, b) => (a.metrics!.total_return_pct > b.metrics!.total_return_pct ? a : b)) : null;
  const worstRow   = analyzed.length ? analyzed.reduce((a, b) => (a.metrics!.total_return_pct < b.metrics!.total_return_pct ? a : b)) : null;
  const health     = portfolioHealth(rows);
  const healthConf = HEALTH_CONFIG[health];

  const allAlerts  = rows.flatMap((r) => r.alerts);
  const critCount  = allAlerts.filter((a) => a.severity === "critical").length;
  const warnCount  = allAlerts.filter((a) => a.severity === "warning").length;
  const alertTotal = critCount + warnCount;

  const trendCounts = {
    improving: rows.filter((r) => r.trend === "improving").length,
    stable:    rows.filter((r) => r.trend === "stable").length,
    atRisk:    rows.filter((r) => r.trend === "at-risk").length,
    declining: rows.filter((r) => r.trend === "declining").length,
  };

  const noStrategies = rows.length === 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Layers2 size={18} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Portfolio
            </h1>
          </div>
          <p className="text-sm text-text-secondary">
            All strategies side by side — performance, risk, and trends at a glance.
          </p>
        </div>
        {!noStrategies && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border",
              healthConf.bg,
              healthConf.cls
            )}
          >
            {healthConf.icon}
            {healthConf.label}
          </span>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {noStrategies && (
        <div className="rounded-2xl border border-border bg-surface-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
            <Layers2 size={20} className="text-text-muted" />
          </div>
          <h2 className="text-base font-bold text-text-primary mb-2">
            No strategies yet
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6 max-w-xs">
            Create strategies and run backtests. Your portfolio overview will
            appear here once you have results.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/ai-strategy"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Generate with AI
            </Link>
            <Link
              href="/dashboard/strategies/new"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-colors"
            >
              Write my own
            </Link>
          </div>
        </div>
      )}

      {!noStrategies && (
        <>
          {/* ── Summary strip ────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-border">

              <StatCell
                label="Strategies"
                value={String(rows.length)}
                sub={`${analyzed.length} analyzed`}
              />

              {avgReturn !== null ? (
                <StatCell
                  label="Avg Return"
                  value={formatPercent(avgReturn)}
                  valueClass={pnlColor(avgReturn)}
                />
              ) : (
                <StatCell label="Avg Return" value="—" sub="No data" />
              )}

              {avgSharpe !== null ? (
                <StatCell
                  label="Avg Sharpe"
                  value={avgSharpe.toFixed(2)}
                  valueClass={avgSharpe >= 1 ? "text-profit" : avgSharpe >= 0.5 ? "text-amber-400" : "text-loss"}
                />
              ) : (
                <StatCell label="Avg Sharpe" value="—" />
              )}

              {bestRow ? (
                <StatCell
                  label="Best"
                  value={formatPercent(bestRow.metrics!.total_return_pct)}
                  valueClass="text-profit"
                  sub={bestRow.name}
                />
              ) : (
                <StatCell label="Best" value="—" />
              )}

              {worstRow ? (
                <StatCell
                  label="Worst"
                  value={formatPercent(worstRow.metrics!.total_return_pct)}
                  valueClass={pnlColor(worstRow.metrics!.total_return_pct)}
                  sub={worstRow.name}
                />
              ) : (
                <StatCell label="Worst" value="—" />
              )}

              <StatCell
                label="Alerts"
                value={alertTotal > 0 ? String(alertTotal) : "None"}
                valueClass={alertTotal > 0 ? (critCount > 0 ? "text-loss" : "text-yellow-400") : "text-profit"}
                sub={critCount > 0 ? `${critCount} critical` : warnCount > 0 ? `${warnCount} warnings` : "All clear"}
              />
            </div>

            {/* Trend distribution bar */}
            {analyzed.length >= 2 && (
              <div className="px-5 py-3 border-t border-border flex items-center gap-6 flex-wrap">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider shrink-0">
                  Trend
                </p>
                {trendCounts.improving > 0 && (
                  <TrendPill count={trendCounts.improving} label="Improving" cls="text-profit" />
                )}
                {trendCounts.stable > 0 && (
                  <TrendPill count={trendCounts.stable} label="Stable" cls="text-text-muted" />
                )}
                {trendCounts.atRisk > 0 && (
                  <TrendPill count={trendCounts.atRisk} label="At-risk" cls="text-yellow-400" />
                )}
                {trendCounts.declining > 0 && (
                  <TrendPill count={trendCounts.declining} label="Declining" cls="text-loss" />
                )}
                {trendCounts.improving === 0 && trendCounts.stable === 0 &&
                 trendCounts.atRisk === 0 && trendCounts.declining === 0 && (
                  <span className="text-xs text-text-muted">Run at least 2 backtests per strategy to see trends</span>
                )}
              </div>
            )}
          </div>

          {/* ── Strategy table ────────────────────────────────────── */}
          <div className="rounded-2xl border border-border overflow-hidden">

            {/* Column header */}
            <div className="hidden lg:grid lg:grid-cols-[minmax(0,2fr)_120px_80px_100px_120px_minmax(0,1fr)_40px] gap-4 px-5 py-2.5 bg-surface-1 border-b border-border">
              {["Strategy", "Return", "Sharpe", "Risk", "Trend", "Verdict", ""].map((h) => (
                <p key={h} className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  {h}
                </p>
              ))}
            </div>

            {/* Strategy rows */}
            <div className="divide-y divide-border bg-surface-0">
              {rows.map((row) => (
                <StrategyTableRow key={row.id} row={row} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={cn("text-xl font-bold font-mono tabular-nums", valueClass ?? "text-text-primary")}>
        {value}
      </p>
      {sub && (
        <p className="text-2xs text-text-muted mt-0.5 truncate">{sub}</p>
      )}
    </div>
  );
}

function TrendPill({
  count,
  label,
  cls,
}: {
  count: number;
  label: string;
  cls: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", cls)}>
      <span className={cn("inline-block w-2 h-2 rounded-full bg-current")} />
      {count} {label}
    </span>
  );
}

function StrategyTableRow({ row }: { row: StrategyRow }) {
  const { metrics } = row;
  const href = row.latestRunId
    ? `/dashboard/results/${row.latestRunId}`
    : `/dashboard/strategies/${row.id}`;

  const verdict = metrics ? generateVerdict(metrics) : null;
  const riskLabel = metrics ? generateRiskLabel(metrics) : null;
  const confidence = metrics ? computeConfidence(metrics) : null;
  const trendConf = row.trend ? TREND_CONFIG[row.trend] : null;

  const critAlert = row.alerts.find((a) => a.severity === "critical");
  const warnAlert = row.alerts.find((a) => a.severity === "warning");
  const activeAlert = critAlert ?? warnAlert ?? null;

  return (
    <Link
      href={href}
      className="group flex flex-col lg:grid lg:grid-cols-[minmax(0,2fr)_120px_80px_100px_120px_minmax(0,1fr)_40px] gap-4 items-start lg:items-center px-5 py-4 hover:bg-surface-1 transition-colors"
    >
      {/* Strategy name */}
      <div className="min-w-0 flex items-start gap-3 w-full lg:w-auto">
        {/* Alert / status indicator */}
        <div className="shrink-0 mt-0.5">
          {critAlert ? (
            <CircleX size={14} className="text-loss" />
          ) : warnAlert ? (
            <TriangleAlert size={14} className="text-yellow-400" />
          ) : metrics ? (
            <Activity size={14} className="text-profit/60" />
          ) : (
            <CircleMinus size={14} className="text-text-muted/30" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate leading-snug">
            {row.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {row.lastSymbol && (
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                {row.lastSymbol}
              </span>
            )}
            <span className="text-2xs text-text-muted">
              {row.runCount > 0
                ? `${row.runCount} ${row.runCount === 1 ? "run" : "runs"}`
                : "No runs yet"}
            </span>
          </div>
          {/* Alert message on mobile / small screens */}
          {activeAlert && (
            <p className="text-2xs text-yellow-400 mt-1 line-clamp-1 lg:hidden">
              {activeAlert.title}
            </p>
          )}
        </div>
      </div>

      {/* Return */}
      <div className="lg:text-right w-full lg:w-auto">
        <p className="text-2xs text-text-muted lg:hidden mb-0.5">Return</p>
        {metrics ? (
          <div className="flex items-center lg:justify-end gap-1">
            {metrics.total_return_pct >= 0.5
              ? <TrendingUp size={11} className="text-profit" />
              : metrics.total_return_pct <= -0.5
              ? <TrendingDown size={11} className="text-loss" />
              : <Minus size={11} className="text-text-muted" />}
            <span className={cn("text-base font-bold font-mono tabular-nums", pnlColor(metrics.total_return_pct))}>
              {formatPercent(metrics.total_return_pct)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-text-muted/40">—</span>
        )}
      </div>

      {/* Sharpe */}
      <div className="w-full lg:w-auto">
        <p className="text-2xs text-text-muted lg:hidden mb-0.5">Sharpe</p>
        {metrics ? (
          <span className={cn(
            "text-sm font-mono font-semibold tabular-nums",
            (metrics.sharpe_ratio ?? 0) >= 1 ? "text-profit"
            : (metrics.sharpe_ratio ?? 0) >= 0.5 ? "text-amber-400"
            : "text-loss"
          )}>
            {(metrics.sharpe_ratio ?? 0).toFixed(2)}
          </span>
        ) : (
          <span className="text-sm text-text-muted/40">—</span>
        )}
      </div>

      {/* Risk */}
      <div className="w-full lg:w-auto">
        <p className="text-2xs text-text-muted lg:hidden mb-0.5">Risk</p>
        {riskLabel ? (
          <span className={cn(
            "text-2xs font-semibold px-2 py-1 rounded-full border",
            RISK_CLS[riskLabel.level]
          )}>
            {riskLabel.label}
          </span>
        ) : (
          <span className="text-sm text-text-muted/40">—</span>
        )}
      </div>

      {/* Trend */}
      <div className="w-full lg:w-auto">
        <p className="text-2xs text-text-muted lg:hidden mb-0.5">Trend</p>
        {trendConf ? (
          <span className={cn("flex items-center gap-1.5 text-xs font-medium", trendConf.cls)}>
            {trendConf.icon}
            {trendConf.label}
          </span>
        ) : row.runCount === 1 ? (
          <span className="text-xs text-text-muted/50">1 run</span>
        ) : (
          <span className="text-xs text-text-muted/40">—</span>
        )}
      </div>

      {/* Verdict */}
      <div className="w-full lg:w-auto min-w-0">
        <p className="text-2xs text-text-muted lg:hidden mb-0.5">AI Verdict</p>
        {verdict ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-2xs font-bold px-2 py-1 rounded-full border leading-none",
              VERDICT_CLS[verdict.color]
            )}>
              {verdict.tagline}
            </span>
            {confidence && (
              <span className="text-2xs text-text-muted hidden xl:inline tabular-nums">
                {confidence.score}/100
              </span>
            )}
          </div>
        ) : !row.hasRuns ? (
          <Link
            href={`/dashboard/backtests?strategy=${row.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <Play size={11} />
            Run first backtest
          </Link>
        ) : (
          <span className="text-xs text-text-muted/40">—</span>
        )}
      </div>

      {/* Arrow */}
      <div className="hidden lg:flex justify-end">
        <ArrowRight
          size={14}
          className="text-text-muted/30 group-hover:text-accent transition-colors"
        />
      </div>
    </Link>
  );
}
