import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentBacktests } from "@/components/dashboard/recent-backtests";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AiPortfolioOverview } from "@/components/dashboard/ai-portfolio-overview";
import { AiStatusBar } from "@/components/dashboard/ai-status-bar";
import { AiAlerts } from "@/components/dashboard/ai-alerts";
import { WelcomePanel } from "@/components/dashboard/welcome-panel";
import { AiActivityFeed } from "@/components/dashboard/ai-activity-feed";
import type { ActivityEvent } from "@/components/dashboard/ai-activity-feed";
import { generateAlerts } from "@/lib/alerts";
import { computeStrategyTrend } from "@/lib/trends";
import type { TrendLabel } from "@/lib/trends";
import { pnlColor, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestMetrics } from "@/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { count: strategyCount },
    { count: backtestCount },
    { data: recentRuns },
    { data: completedRuns },
  ] = await Promise.all([
    supabase
      .from("strategies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("backtest_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("backtest_runs")
      .select("*, strategies(name)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("backtest_runs")
      .select("id, strategy_id, results, started_at, completed_at, config, strategies(name)")
      .eq("user_id", user!.id)
      .eq("status", "completed"),
  ]);

  // Compute aggregate stats
  let bestSharpe: string | null = null;
  let avgRunTime: string | null = null;
  let bestRun: { id: string; name: string; symbol: string; returnPct: number } | null = null;

  // AI overview run summaries
  const aiRunSummaries: {
    id: string;
    name: string;
    symbol: string;
    returnPct: number;
    sharpe: number;
    drawdown: number;
    trades: number;
    metrics: BacktestMetrics;
  }[] = [];

  if (completedRuns?.length) {
    const sharpes = completedRuns
      .map((r) => {
        const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
        return m?.sharpe_ratio;
      })
      .filter((v): v is number => v !== undefined && !isNaN(v));

    if (sharpes.length) bestSharpe = Math.max(...sharpes).toFixed(2);

    const durations = completedRuns
      .filter((r) => r.started_at && r.completed_at)
      .map((r) => (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 1000);

    if (durations.length) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      avgRunTime = avg < 60 ? `${Math.round(avg)}s` : `${(avg / 60).toFixed(1)}m`;
    }

    // Best return run + AI summaries
    let topReturn = -Infinity;
    for (const r of completedRuns) {
      const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
      const cfg = r.config as Record<string, unknown> | null;
      const ret = m?.total_return_pct;

      if (ret !== undefined && ret > topReturn) {
        topReturn = ret;
        bestRun = {
          id: r.id as string,
          name: (cfg?.name as string) || (cfg?.symbol as string) || "—",
          symbol: (cfg?.symbol as string) || "—",
          returnPct: ret,
        };
      }

      // Build AI overview data for runs with full metrics
      if (m && m.sharpe_ratio !== undefined && m.max_drawdown_pct !== undefined && m.total_trades !== undefined && ret !== undefined) {
        aiRunSummaries.push({
          id: r.id as string,
          name: (cfg?.name as string) || (cfg?.symbol as string) || "—",
          symbol: (cfg?.symbol as string) || "—",
          returnPct: ret,
          sharpe: m.sharpe_ratio,
          drawdown: Math.abs(m.max_drawdown_pct),
          trades: m.total_trades,
          metrics: m as unknown as BacktestMetrics,
        });
      }
    }
  }

  // Compute per-strategy trends (run id → trend label)
  const strategyRunMap = new Map<string, { id: string; completedAt: string; returnPct: number; sharpe: number; drawdown: number; winRate: number; trades: number }[]>();
  for (const r of completedRuns ?? []) {
    const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
    const sid = r.strategy_id as string | undefined;
    if (!m || !sid || m.total_return_pct === undefined) continue;
    const entry = strategyRunMap.get(sid) ?? [];
    entry.push({ id: r.id as string, completedAt: (r.completed_at as string) ?? "", returnPct: m.total_return_pct, sharpe: m.sharpe_ratio ?? 0, drawdown: Math.abs(m.max_drawdown_pct ?? 0), winRate: m.win_rate_pct ?? 0, trades: m.total_trades ?? 0 });
    strategyRunMap.set(sid, entry);
  }
  // Map from latest run id → trend label (for portfolio overview chips)
  const runTrends: Record<string, TrendLabel> = {};
  for (const [, sRuns] of strategyRunMap) {
    const sorted = [...sRuns].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const trend = computeStrategyTrend(sorted.map((r) => ({ returnPct: r.returnPct, sharpe: r.sharpe, drawdown: r.drawdown, winRate: r.winRate, trades: r.trades })));
    if (trend && sorted.length > 0) {
      runTrends[sorted[sorted.length - 1].id] = trend;
    }
  }

  // Build alert inputs from completed runs with full metrics
  const alertRunInputs = (completedRuns ?? []).flatMap((r) => {
    const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
    const cfg = r.config as Record<string, unknown> | null;
    if (!m || m.total_return_pct === undefined || m.sharpe_ratio === undefined) return [];
    const stratName = (r as Record<string, unknown> & { strategies?: { name?: string } }).strategies?.name
      || (cfg?.name as string)
      || (cfg?.symbol as string)
      || "—";
    return [{
      id: r.id as string,
      strategyId: (r.strategy_id as string) || r.id as string,
      strategyName: stratName,
      symbol: (cfg?.symbol as string) || "—",
      completedAt: (r.completed_at as string) || (r.started_at as string) || new Date().toISOString(),
      returnPct: m.total_return_pct,
      sharpe: m.sharpe_ratio,
      drawdown: Math.abs(m.max_drawdown_pct ?? 0),
      trades: m.total_trades ?? 0,
      winRate: m.win_rate_pct ?? 0,
    }];
  });
  const dashboardAlerts = generateAlerts(alertRunInputs);

  // Build activity feed events from completed runs + alerts
  const activityEvents: ActivityEvent[] = [];

  // One "analysis completed" event per completed run (most recent 6)
  const sortedCompleted = [...(completedRuns ?? [])]
    .sort((a, b) => {
      const ta = new Date((a.completed_at as string | null) ?? 0).getTime();
      const tb = new Date((b.completed_at as string | null) ?? 0).getTime();
      return tb - ta;
    })
    .slice(0, 6);

  for (const r of sortedCompleted) {
    const cfg = r.config as Record<string, unknown> | null;
    const symbol = (cfg?.symbol as string) || "—";
    const ts = (r.completed_at as string | null) || (r.started_at as string | null);
    if (ts) {
      activityEvents.push({
        id: `analysis-${r.id as string}`,
        type: "analysis",
        title: `Backtest analyzed · ${symbol}`,
        subtitle: "AI insights generated",
        timestamp: ts,
        runId: r.id as string,
      });
    }
  }

  // Alert-derived events (distinct from run events)
  for (const alert of dashboardAlerts.slice(0, 5)) {
    const type: ActivityEvent["type"] =
      alert.title.toLowerCase().includes("improv") ? "improvement" :
      alert.severity === "critical"                ? "decline" :
      alert.severity === "warning"                 ? "warning" :
      "insight";
    activityEvents.push({
      id: `alert-${alert.id}`,
      type,
      title: alert.title,
      subtitle: alert.strategyName !== alert.symbol ? alert.strategyName : undefined,
      timestamp: alert.completedAt,
      runId: alert.runId,
    });
  }

  // Merge, de-duplicate by runId (keep most informative), sort desc
  const seen = new Set<string>();
  const feedEvents = activityEvents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter((e) => {
      const key = e.runId ?? e.id;
      if (seen.has(key) && e.type === "analysis") return false; // prefer alert version over plain analysis for same run
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  // Last completed run time for AI status bar
  const lastRunAt = (completedRuns ?? [])
    .map((r) => r.completed_at as string | null)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Trader";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Greeting header ───────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-text-muted mb-0.5">{greeting},</p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            {displayName}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">{dateLabel}</p>
          {(strategyCount ?? 0) + (backtestCount ?? 0) > 0 && (
            <p className="text-xs text-text-secondary mt-0.5">
              {strategyCount ?? 0} {strategyCount === 1 ? "strategy" : "strategies"}
              {" · "}
              {backtestCount ?? 0} {backtestCount === 1 ? "run" : "runs"}
            </p>
          )}
        </div>
      </div>

      {/* ── New user: welcome panel ────────────────────────────── */}
      {(strategyCount ?? 0) === 0 && (backtestCount ?? 0) === 0 ? (
        <WelcomePanel name={displayName} />
      ) : (
        <>
          {/* ── Portfolio Health (leads the page) ────────────────── */}
          {aiRunSummaries.length > 0 ? (
            <AiPortfolioOverview runs={aiRunSummaries} lastRunAt={lastRunAt} trends={runTrends} />
          ) : (
            <AiStatusBar strategyCount={strategyCount ?? 0} lastRunAt={lastRunAt} />
          )}

          {/* ── AI Alerts ─────────────────────────────────────── */}
          {dashboardAlerts.length > 0 && (
            <AiAlerts alerts={dashboardAlerts} variant="full" />
          )}

          {/* ── Stats strip ───────────────────────────────────── */}
          <DashboardStats
            strategyCount={strategyCount ?? 0}
            backtestCount={backtestCount ?? 0}
            bestSharpe={bestSharpe}
            avgRunTime={avgRunTime}
          />

          {/* ── AI Activity Feed ──────────────────────────────── */}
          <AiActivityFeed events={feedEvents} />

          {/* ── Main content ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Recent backtests */}
            <div className="lg:col-span-2">
              <RecentBacktests runs={recentRuns ?? []} />
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              <QuickActions />

              {/* Best performer spotlight */}
              {bestRun && (
                <Link
                  href={`/dashboard/results/${bestRun.id}`}
                  className="group rounded-2xl border border-profit/20 bg-gradient-to-br from-profit/[0.05] via-surface-1 to-surface-1 p-5 hover:border-profit/40 transition-colors"
                >
                  <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-3">
                    Best Performer
                  </p>
                  <p className={cn("text-4xl font-bold font-mono tabular-nums tracking-tight leading-none", pnlColor(bestRun.returnPct))}>
                    {formatPercent(bestRun.returnPct)}
                  </p>
                  <p className="text-sm text-text-secondary mt-2 truncate">{bestRun.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-2xs font-mono text-text-muted bg-surface-3 px-2 py-0.5 rounded">
                      {bestRun.symbol}
                    </span>
                    <span className="text-xs text-accent group-hover:text-accent-hover transition-colors flex items-center gap-1">
                      View results <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
