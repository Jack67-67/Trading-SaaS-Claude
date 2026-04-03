import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentBacktests } from "@/components/dashboard/recent-backtests";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AiPortfolioOverview } from "@/components/dashboard/ai-portfolio-overview";
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
      .select("id, results, started_at, completed_at, config")
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

      {/* ── Stats strip ───────────────────────────────────────── */}
      <DashboardStats
        strategyCount={strategyCount ?? 0}
        backtestCount={backtestCount ?? 0}
        bestSharpe={bestSharpe}
        avgRunTime={avgRunTime}
      />

      {/* ── AI Portfolio Overview ─────────────────────────────── */}
      {aiRunSummaries.length > 0 && (
        <AiPortfolioOverview runs={aiRunSummaries} />
      )}

      {/* ── Main content ──────────────────────────────────────── */}
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
    </div>
  );
}
