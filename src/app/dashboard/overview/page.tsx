import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare } from "lucide-react";
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
import type { AppAlert } from "@/lib/alerts";
import { computeStrategyTrend, compareTwoRuns } from "@/lib/trends";
import { TodayOverview } from "@/components/dashboard/today-overview";
import type { StrategyOverviewCard } from "@/components/dashboard/today-overview";
import { NextAction } from "@/components/dashboard/next-action";
import { generateNextActions } from "@/lib/next-actions";
import type { NextActionItem } from "@/lib/next-actions";
import { pnlColor, formatPercent, cn } from "@/lib/utils";
import type { BacktestMetrics } from "@/types";
import { DailyUpdate } from "@/components/dashboard/daily-update";
import type { StrategyDailyUpdate } from "@/components/dashboard/daily-update";

export const metadata: Metadata = { title: "Overview" };

// ── Pure helper (module-level) ─────────────────────────────────────────────────
function firstRunSummary(returnPct: number, sharpe: number): string {
  const r = typeof returnPct === "number" && isFinite(returnPct) ? returnPct : 0;
  const s = typeof sharpe    === "number" && isFinite(sharpe)    ? sharpe    : 0;
  if (r > 15 && s > 1.2)
    return `Strong first run — ${r.toFixed(1)}% return with a Sharpe of ${s.toFixed(2)}.`;
  if (r > 0)
    return `Profitable first run at ${r.toFixed(1)}% return. Run again to establish a trend direction.`;
  return `First run came in negative at ${r.toFixed(1)}%. Review the entry conditions before running again.`;
}

// ── Safe metric extractor ──────────────────────────────────────────────────────
// Reads a numeric field from a raw metrics object. Falls back to 0 if the
// field is missing, null, or not a finite number.
function safeNum(m: Record<string, unknown> | undefined, key: string): number {
  if (!m) return 0;
  const v = m[key];
  return typeof v === "number" && isFinite(v) ? v : 0;
}

// ── Empty state ────────────────────────────────────────────────────────────────
function OverviewEmpty() {
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Overview</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your strategies, results, and performance at a glance.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">{dateLabel}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <div className="px-6 py-12 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-2">
              No activity yet
            </p>
            <h2 className="text-lg font-bold tracking-tight text-text-primary mb-2">
              Describe your first strategy or run an example to start seeing results.
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Once you run a backtest, your results and performance data will appear here.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Link
              href="/dashboard/strategies/describe"
              className={cn(
                "flex-1 w-full group rounded-xl border border-accent/30 bg-accent/[0.06]",
                "hover:border-accent/60 hover:bg-accent/[0.11] transition-all duration-150",
                "flex items-center justify-center gap-2 px-4 py-2.5"
              )}
            >
              <MessageSquare size={14} className="text-accent shrink-0" />
              <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                Describe strategy
              </span>
            </Link>
            <TryExampleButton size="default" className="flex-1 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function OverviewPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // ── Step 1: lightweight count check ────────────────────────────────────────
  let strategyCount = 0;
  let backtestCount = 0;
  try {
    const [sc, bc] = await Promise.all([
      supabase
        .from("strategies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("backtest_runs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    strategyCount = sc.count ?? 0;
    backtestCount = bc.count ?? 0;
  } catch {
    // stays 0 / 0
  }

  // ── EARLY RETURN: nothing to show ──────────────────────────────────────────
  if (strategyCount === 0 && backtestCount === 0) {
    return <OverviewEmpty />;
  }

  // ── Step 2a: fetch data ────────────────────────────────────────────────────
  // Each section has its own try/catch so a failure in one section does NOT
  // prevent the rest of the page from rendering.

  let recentRuns: any[] = [];
  let completedRuns: any[] = [];

  try {
    const [rr, cr] = await Promise.all([
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
    recentRuns    = rr.data ?? [];
    completedRuns = cr.data ?? [];
  } catch {
    // both stay []
  }

  // ── Step 2b: aggregate stats ───────────────────────────────────────────────
  let bestSharpe: string | null = null;
  let avgRunTime: string | null = null;
  let bestRun: { id: string; name: string; symbol: string; returnPct: number } | null = null;
  let aiRunSummaries: {
    id: string; name: string; symbol: string;
    returnPct: number; sharpe: number; drawdown: number; trades: number;
    metrics: BacktestMetrics;
  }[] = [];

  try {
    if (completedRuns.length > 0) {
      const sharpes = completedRuns
        .map((r) => {
          const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, unknown> | undefined;
          const v = m?.sharpe_ratio;
          return typeof v === "number" && isFinite(v) ? v : null;
        })
        .filter((v): v is number => v !== null);

      if (sharpes.length > 0) bestSharpe = Math.max(...sharpes).toFixed(2);

      const durations = completedRuns
        .filter((r) => r.started_at && r.completed_at)
        .map((r) => {
          const diff = new Date(r.completed_at as string).getTime() - new Date(r.started_at as string).getTime();
          return diff / 1000;
        })
        .filter((d) => isFinite(d) && d > 0);

      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        avgRunTime = avg < 60 ? `${Math.round(avg)}s` : `${(avg / 60).toFixed(1)}m`;
      }

      let topReturn = -Infinity;
      for (const r of completedRuns) {
        const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, unknown> | undefined;
        const cfg = r.config as Record<string, unknown> | null;
        const ret = m ? safeNum(m as Record<string, unknown>, "total_return_pct") : null;
        const hasRet = m && typeof (m as Record<string, unknown>).total_return_pct === "number";

        if (hasRet && typeof ret === "number" && ret > topReturn) {
          topReturn = ret;
          bestRun = {
            id: String(r.id ?? ""),
            name: (cfg?.name as string) || (cfg?.symbol as string) || "—",
            symbol: (cfg?.symbol as string) || "—",
            returnPct: ret,
          };
        }

        // Only include in AI summaries when the key metrics are real numbers
        if (
          m &&
          typeof (m as Record<string, unknown>).sharpe_ratio     === "number" &&
          typeof (m as Record<string, unknown>).max_drawdown_pct === "number" &&
          typeof (m as Record<string, unknown>).total_trades     === "number" &&
          typeof (m as Record<string, unknown>).total_return_pct === "number"
        ) {
          const mm = m as Record<string, unknown>;
          aiRunSummaries.push({
            id:        String(r.id ?? ""),
            name:      (cfg?.name as string) || (cfg?.symbol as string) || "—",
            symbol:    (cfg?.symbol as string) || "—",
            returnPct: safeNum(mm, "total_return_pct"),
            sharpe:    safeNum(mm, "sharpe_ratio"),
            drawdown:  Math.abs(safeNum(mm, "max_drawdown_pct")),
            trades:    safeNum(mm, "total_trades"),
            metrics:   m as unknown as BacktestMetrics,
          });
        }
      }
    }
  } catch {
    // partial stats loss — bestSharpe/avgRunTime/bestRun/aiRunSummaries stay at their defaults
  }

  // ── Step 2c: strategy run map ──────────────────────────────────────────────
  const strategyRunMap = new Map<string, {
    id: string; completedAt: string;
    returnPct: number; sharpe: number; drawdown: number; winRate: number; trades: number;
  }[]>();

  try {
    for (const r of completedRuns) {
      const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, unknown> | undefined;
      const sid = r.strategy_id as string | undefined;
      if (!m || !sid || typeof (m as Record<string, unknown>).total_return_pct !== "number") continue;
      const mm = m as Record<string, unknown>;
      const entry = strategyRunMap.get(sid) ?? [];
      entry.push({
        id:          String(r.id ?? ""),
        completedAt: (r.completed_at as string | null) ?? "",
        returnPct:   safeNum(mm, "total_return_pct"),
        sharpe:      safeNum(mm, "sharpe_ratio"),
        drawdown:    Math.abs(safeNum(mm, "max_drawdown_pct")),
        winRate:     safeNum(mm, "win_rate_pct"),
        trades:      safeNum(mm, "total_trades"),
      });
      strategyRunMap.set(sid, entry);
    }
  } catch {
    // map stays partially filled or empty — the rest of the page still renders
  }

  // ── Step 2d: alerts ────────────────────────────────────────────────────────
  let dashboardAlerts: AppAlert[] = [];

  try {
    const alertRunInputs = completedRuns.flatMap((r) => {
      const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, unknown> | undefined;
      const cfg = r.config as Record<string, unknown> | null;
      if (
        !m ||
        typeof (m as Record<string, unknown>).total_return_pct !== "number" ||
        typeof (m as Record<string, unknown>).sharpe_ratio     !== "number"
      ) return [];
      const mm = m as Record<string, unknown>;
      const stratName =
        (r as Record<string, unknown> & { strategies?: { name?: string } }).strategies?.name ||
        (cfg?.name as string) || (cfg?.symbol as string) || "—";
      return [{
        id:           String(r.id ?? ""),
        strategyId:   (r.strategy_id as string) || String(r.id ?? ""),
        strategyName: stratName,
        symbol:       (cfg?.symbol as string) || "—",
        completedAt:  (r.completed_at as string) || new Date().toISOString(),
        returnPct:    safeNum(mm, "total_return_pct"),
        sharpe:       safeNum(mm, "sharpe_ratio"),
        drawdown:     Math.abs(safeNum(mm, "max_drawdown_pct")),
        trades:       safeNum(mm, "total_trades"),
        winRate:      safeNum(mm, "win_rate_pct"),
      }];
    });
    dashboardAlerts = generateAlerts(alertRunInputs);
  } catch {
    // dashboardAlerts stays []
  }

  // ── Step 2e: strategy overview cards + daily updates ───────────────────────
  let strategyDailyUpdates: StrategyDailyUpdate[] = [];
  let strategyOverviewCards: StrategyOverviewCard[] = [];

  try {
    for (const [sid, sRuns] of strategyRunMap) {
      try {
        const sorted = [...sRuns].sort((a, b) =>
          (a.completedAt || "").localeCompare(b.completedAt || "")
        );
        const latest = sorted[sorted.length - 1];
        const prev   = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

        const runRecord = completedRuns.find((r) => String(r.id ?? "") === latest.id);
        const cfg       = runRecord?.config as Record<string, unknown> | null;
        const stratRef  = runRecord as Record<string, unknown> & { strategies?: { name?: string } };
        const stratName = stratRef?.strategies?.name || (cfg?.name as string) || sid.slice(0, 8);
        const symbol    = (cfg?.symbol as string) || "—";

        let summary: string;
        try {
          summary = prev
            ? compareTwoRuns(
                { returnPct: latest.returnPct, sharpe: latest.sharpe, drawdown: latest.drawdown, winRate: latest.winRate, trades: latest.trades },
                { returnPct: prev.returnPct,   sharpe: prev.sharpe,   drawdown: prev.drawdown,   winRate: prev.winRate,   trades: prev.trades   },
              ).summary
            : firstRunSummary(latest.returnPct, latest.sharpe);
        } catch {
          summary = firstRunSummary(latest.returnPct, latest.sharpe);
        }

        const returnDelta = prev ? latest.returnPct - prev.returnPct : null;
        const sharpeDelta = prev ? latest.sharpe    - prev.sharpe    : null;

        let trend: ReturnType<typeof computeStrategyTrend> = null;
        try {
          trend = computeStrategyTrend(
            sorted.map((r) => ({
              returnPct: r.returnPct, sharpe: r.sharpe,
              drawdown: r.drawdown, winRate: r.winRate, trades: r.trades,
            }))
          );
        } catch {
          // trend stays null
        }

        const stratAlerts = dashboardAlerts.filter((a) => a.strategyId === sid);

        strategyDailyUpdates.push({
          strategyId:     sid,
          strategyName:   stratName,
          symbol,
          latestRunId:    latest.id || null,
          lastAnalyzedAt: latest.completedAt || null,
          returnPct:      latest.returnPct,
          returnDelta,
          sharpeDelta,
          trend,
          isFirstRun:     sorted.length === 1,
        });

        strategyOverviewCards.push({
          strategyId:   sid,
          strategyName: stratName,
          symbol,
          latestRunId:  latest.id || "",
          latestRunAt:  latest.completedAt || new Date().toISOString(),
          trend,
          returnPct:    latest.returnPct,
          sharpe:       latest.sharpe,
          isBest:       false,
          isWorst:      false,
          summary,
          alerts:       stratAlerts,
        });
      } catch {
        // skip this strategy — don't let one bad strategy crash the whole loop
      }
    }

    if (strategyOverviewCards.length > 0) {
      const byReturn = [...strategyOverviewCards].sort((a, b) => b.returnPct - a.returnPct);
      strategyOverviewCards.forEach((card) => {
        card.isBest  = card.strategyId === byReturn[0].strategyId;
        card.isWorst = byReturn.length > 1 && card.strategyId === byReturn[byReturn.length - 1].strategyId;
      });
      strategyOverviewCards.sort((a, b) => b.returnPct - a.returnPct);
    }
  } catch {
    // strategyOverviewCards / strategyDailyUpdates stay at whatever was built before error
  }

  // ── Step 2f: activity feed + lastRunAt ─────────────────────────────────────
  let feedEvents: ActivityEvent[] = [];
  let lastRunAt: string | null = null;

  try {
    const activityEvents: ActivityEvent[] = [];
    const sortedCompleted = [...completedRuns]
      .sort((a, b) => {
        const ta = new Date((a.completed_at as string | null) ?? 0).getTime();
        const tb = new Date((b.completed_at as string | null) ?? 0).getTime();
        return (isFinite(tb) ? tb : 0) - (isFinite(ta) ? ta : 0);
      })
      .slice(0, 6);

    for (const r of sortedCompleted) {
      const cfg = r.config as Record<string, unknown> | null;
      const ts  = (r.completed_at as string | null) || (r.started_at as string | null);
      if (ts) {
        activityEvents.push({
          id:       `analysis-${String(r.id ?? "")}`,
          type:     "analysis",
          title:    `Backtest analyzed · ${(cfg?.symbol as string) || "—"}`,
          subtitle: "AI insights generated",
          timestamp: ts,
          runId:    String(r.id ?? ""),
        });
      }
    }

    for (const alert of dashboardAlerts.slice(0, 5)) {
      const type: ActivityEvent["type"] =
        alert.title.toLowerCase().includes("improv") ? "improvement" :
        alert.severity === "critical"                ? "decline"     :
        alert.severity === "warning"                 ? "warning"     :
        "insight";
      activityEvents.push({
        id:        `alert-${alert.id}`,
        type,
        title:     alert.title,
        subtitle:  alert.strategyName !== alert.symbol ? alert.strategyName : undefined,
        timestamp: alert.completedAt,
        runId:     alert.runId,
      });
    }

    const seen = new Set<string>();
    feedEvents = activityEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((e) => {
        const key = e.runId ?? e.id;
        if (seen.has(key) && e.type === "analysis") return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);

    lastRunAt = completedRuns
      .map((r) => r.completed_at as string | null)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? null;
  } catch {
    // feedEvents stays [], lastRunAt stays null
  }

  // ── Step 2g: next actions ──────────────────────────────────────────────────
  let nextActions: NextActionItem[] = [];

  try {
    nextActions = generateNextActions({
      alerts: dashboardAlerts,
      strategies: strategyOverviewCards.map((c) => ({
        id:          c.strategyId,
        name:        c.strategyName,
        trend:       c.trend,
        returnPct:   c.returnPct,
        latestRunId: c.latestRunId,
      })),
      totalRuns:       backtestCount,
      totalStrategies: strategyCount,
    });
  } catch {
    // nextActions stays []
  }

  // ── Full render ────────────────────────────────────────────────────────────
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Overview</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your strategies, results, and performance at a glance.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">{dateLabel}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {strategyCount} {strategyCount === 1 ? "strategy" : "strategies"}
            {" · "}
            {backtestCount} {backtestCount === 1 ? "run" : "runs"}
          </p>
        </div>
      </div>

      {/* ── Today's Update ──────────────────────────────────────── */}
      {(strategyDailyUpdates.length > 0 || strategyCount > 0) && (
        <DailyUpdate
          updates={strategyDailyUpdates}
          alerts={dashboardAlerts}
          lastUpdatedAt={lastRunAt}
        />
      )}

      {/* ── Portfolio Health ────────────────────────────────────── */}
      {aiRunSummaries.length > 0 ? (
        <AiPortfolioOverview runs={aiRunSummaries} lastRunAt={lastRunAt} trends={{}} />
      ) : (
        <AiStatusBar strategyCount={strategyCount} lastRunAt={lastRunAt} />
      )}

      {/* ── Next Actions ────────────────────────────────────────── */}
      {nextActions.length > 0 && (
        <NextAction actions={nextActions} />
      )}

      {/* ── Today's Overview ────────────────────────────────────── */}
      {strategyOverviewCards.length > 0 && (
        <TodayOverview strategies={strategyOverviewCards} />
      )}

      {/* ── AI Alerts ───────────────────────────────────────────── */}
      {dashboardAlerts.length > 0 && strategyOverviewCards.length === 0 && (
        <AiAlerts alerts={dashboardAlerts} variant="full" />
      )}

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <DashboardStats
        strategyCount={strategyCount}
        backtestCount={backtestCount}
        bestSharpe={bestSharpe}
        avgRunTime={avgRunTime}
      />

      {/* ── AI Activity Feed ────────────────────────────────────── */}
      <AiActivityFeed events={feedEvents} />

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RecentBacktests runs={recentRuns} />
        </div>
        <div className="flex flex-col gap-4">
          <QuickActions />
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

    </div>
  );
}
