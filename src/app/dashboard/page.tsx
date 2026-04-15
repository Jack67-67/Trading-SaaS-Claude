import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare, Code2, FlaskConical, BarChart3, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentBacktests } from "@/components/dashboard/recent-backtests";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AiPortfolioOverview } from "@/components/dashboard/ai-portfolio-overview";
import { AiStatusBar } from "@/components/dashboard/ai-status-bar";
import { AiAlerts } from "@/components/dashboard/ai-alerts";
import { AiActivityFeed } from "@/components/dashboard/ai-activity-feed";
import type { ActivityEvent } from "@/components/dashboard/ai-activity-feed";
import { TryExampleButton } from "@/components/dashboard/try-example-button";
import { generateAlerts } from "@/lib/alerts";
import { computeStrategyTrend, compareTwoRuns } from "@/lib/trends";
import type { TrendLabel } from "@/lib/trends";
import { TodayOverview } from "@/components/dashboard/today-overview";
import type { StrategyOverviewCard } from "@/components/dashboard/today-overview";
import { NextAction } from "@/components/dashboard/next-action";
import { generateNextActions } from "@/lib/next-actions";
import { pnlColor, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestMetrics } from "@/types";
import { DailyUpdate } from "@/components/dashboard/daily-update";
import type { StrategyDailyUpdate } from "@/components/dashboard/daily-update";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let strategyCount: number | null = 0;
  let backtestCount: number | null = 0;
  let recentRuns: any[] | null = [];
  let completedRuns: any[] | null = [];

  try {
    const [sc, bc, rr, cr] = await Promise.all([
      supabase
        .from("strategies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("backtest_runs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("backtest_runs")
        .select("*, strategies(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("backtest_runs")
        .select("id, strategy_id, results, started_at, completed_at, config, strategies(name)")
        .eq("user_id", user.id)
        .eq("status", "completed"),
    ]);
    strategyCount = sc.count;
    backtestCount = bc.count;
    recentRuns = rr.data;
    completedRuns = cr.data;
  } catch {
    // Data fetch failed — treat as empty state so new users see onboarding
  }

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

  // ── Per-strategy "Today / Overview" cards ───────────────────────────────────

  function firstRunSummary(returnPct: number, sharpe: number): string {
    if (returnPct > 15 && sharpe > 1.2)
      return `Strong first run — ${returnPct.toFixed(1)}% return with a Sharpe of ${sharpe.toFixed(2)}.`;
    if (returnPct > 0)
      return `Profitable first run at ${returnPct.toFixed(1)}% return. Run again to establish a trend direction.`;
    return `First run came in negative at ${returnPct.toFixed(1)}%. Review the entry conditions before running again.`;
  }

  const strategyOverviewCards: StrategyOverviewCard[] = [];
  const strategyDailyUpdates: StrategyDailyUpdate[] = [];

  for (const [sid, sRuns] of strategyRunMap) {
    const sorted = [...sRuns].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const latest = sorted[sorted.length - 1];
    const prev   = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

    // Look up name + symbol from the raw completed run record
    const runRecord = (completedRuns ?? []).find((r) => (r.id as string) === latest.id);
    const cfg      = runRecord?.config as Record<string, unknown> | null;
    const stratRef = runRecord as Record<string, unknown> & { strategies?: { name?: string } };
    const stratName = stratRef?.strategies?.name || (cfg?.name as string) || sid.slice(0, 8);
    const symbol    = (cfg?.symbol as string) || "—";

    // 1-line summary: comparison text if prev run exists, otherwise first-run blurb
    let summary: string;
    let returnDelta: number | null = null;
    let sharpeDelta: number | null = null;
    if (prev) {
      const comp = compareTwoRuns(
        { returnPct: latest.returnPct, sharpe: latest.sharpe, drawdown: latest.drawdown, winRate: latest.winRate, trades: latest.trades },
        { returnPct: prev.returnPct,   sharpe: prev.sharpe,   drawdown: prev.drawdown,   winRate: prev.winRate,   trades: prev.trades },
      );
      summary = comp.summary;
      returnDelta = latest.returnPct - prev.returnPct;
      sharpeDelta = latest.sharpe - prev.sharpe;
    } else {
      summary = firstRunSummary(latest.returnPct, latest.sharpe);
    }

    const trend = computeStrategyTrend(
      sorted.map((r) => ({ returnPct: r.returnPct, sharpe: r.sharpe, drawdown: r.drawdown, winRate: r.winRate, trades: r.trades }))
    );
    const stratAlerts = dashboardAlerts.filter((a) => a.strategyId === sid);

    strategyDailyUpdates.push({
      strategyId: sid,
      strategyName: stratName,
      symbol,
      latestRunId: latest.id,
      lastAnalyzedAt: latest.completedAt || null,
      returnPct: latest.returnPct,
      returnDelta,
      sharpeDelta,
      trend,
      isFirstRun: sorted.length === 1,
    });

    strategyOverviewCards.push({
      strategyId: sid,
      strategyName: stratName,
      symbol,
      latestRunId: latest.id,
      latestRunAt: latest.completedAt,
      trend,
      returnPct: latest.returnPct,
      sharpe: latest.sharpe,
      isBest: false,
      isWorst: false,
      summary,
      alerts: stratAlerts,
    });
  }

  // Mark best and worst by return pct
  if (strategyOverviewCards.length > 0) {
    const byReturn = [...strategyOverviewCards].sort((a, b) => b.returnPct - a.returnPct);
    const bestId  = byReturn[0].strategyId;
    const worstId = byReturn.length > 1 ? byReturn[byReturn.length - 1].strategyId : null;
    for (const card of strategyOverviewCards) {
      if (card.strategyId === bestId)  card.isBest  = true;
      if (worstId && card.strategyId === worstId) card.isWorst = true;
    }
    // Sort: best first, then by return desc
    strategyOverviewCards.sort((a, b) => b.returnPct - a.returnPct);
  }

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

  // ── Next actions ────────────────────────────────────────────────────────────
  const nextActions = generateNextActions({
    alerts: dashboardAlerts,
    strategies: strategyOverviewCards.map((c) => ({
      id: c.strategyId,
      name: c.strategyName,
      trend: c.trend,
      returnPct: c.returnPct,
      latestRunId: c.latestRunId,
    })),
    totalRuns: backtestCount ?? 0,
    totalStrategies: strategyCount ?? 0,
  });

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
          <p className="text-2xs text-text-muted/50 mt-1.5 font-medium tracking-widest uppercase">
            No emotion. No guesswork. Just data.
          </p>
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

      {/* ── New user: onboarding ──────────────────────────────── */}
      {(strategyCount ?? 0) === 0 && (backtestCount ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-2">
                Get started
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-3">
                Welcome, {displayName}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Describe your strategy, run a backtest, and see if it actually works.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
              <Link
                href="/dashboard/strategies/describe"
                className={cn(
                  "flex-1 w-full group rounded-xl border border-accent/30 bg-accent/[0.06]",
                  "hover:border-accent/60 hover:bg-accent/[0.11] transition-all duration-150",
                  "flex items-center justify-center gap-2.5 px-5 py-3"
                )}
              >
                <MessageSquare size={15} className="text-accent shrink-0" />
                <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  Describe strategy
                </span>
              </Link>

              <TryExampleButton size="default" className="flex-1 w-full" />
            </div>
          </div>

          {/* ── How it works ────────────────────────────── */}
          <div className="border-t border-border px-6 py-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4 text-center">
              How it works
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { icon: Code2,        step: "1", label: "Define a strategy",    desc: "Describe your idea — AI writes the code" },
                { icon: FlaskConical, step: "2", label: "Run a backtest",       desc: "Test on real data before risking money" },
                { icon: BarChart3,    step: "3", label: "Read the AI analysis", desc: "Understand what worked, what failed, and why" },
                { icon: ShieldCheck,  step: "4", label: "Refine and validate",  desc: "Build confidence in your edge one test at a time" },
              ] as const).map(({ icon: Icon, step, label, desc }) => (
                <div key={step} className="rounded-xl border border-border bg-surface-0 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-mono font-bold text-accent/50 w-4">{step}</span>
                    <Icon size={13} className="text-accent/70" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{label}</p>
                    <p className="text-2xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Today's Update ────────────────────────────────────── */}
          {(strategyDailyUpdates.length > 0 || (strategyCount ?? 0) > 0) && (
            <DailyUpdate
              updates={strategyDailyUpdates}
              alerts={dashboardAlerts}
              lastUpdatedAt={lastRunAt}
            />
          )}

          {/* ── Portfolio Health ───────────────────────────────────── */}
          {aiRunSummaries.length > 0 ? (
            <AiPortfolioOverview runs={aiRunSummaries} lastRunAt={lastRunAt} trends={runTrends} />
          ) : (
            <AiStatusBar strategyCount={strategyCount ?? 0} lastRunAt={lastRunAt} />
          )}

          {/* ── Next Actions ──────────────────────────────────── */}
          {nextActions.length > 0 && (
            <NextAction actions={nextActions} />
          )}

          {/* ── Today's Overview ──────────────────────────────── */}
          {strategyOverviewCards.length > 0 && (
            <TodayOverview strategies={strategyOverviewCards} />
          )}

          {/* ── AI Alerts (full detail — shown only when no overview) */}
          {dashboardAlerts.length > 0 && strategyOverviewCards.length === 0 && (
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
