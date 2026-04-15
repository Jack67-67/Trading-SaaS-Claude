import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FlaskConical, TrendingUp, TrendingDown, Code2, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { BacktestForm } from "@/components/dashboard/backtest-form";
import { formatDateTime, formatPercent, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types";

export const metadata: Metadata = {
  title: "Backtests",
};

export default async function BacktestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: strategies } = await supabase
    .from("strategies")
    .select("id, name, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const { data: runs } = await supabase
    .from("backtest_runs")
    .select("id, status, config, results, created_at, started_at, completed_at, error_message, strategy_id, strategies(name)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const runList = runs ?? [];
  const strategyList = strategies ?? [];

  // Summary stats for header
  const completedRuns = runList.filter((r) => r.status === "completed");
  const activeRuns = runList.filter((r) => r.status === "running" || r.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Backtests</h1>
          <p className="text-sm text-text-secondary mt-1">
            Test your strategy on real historical data before risking money.
          </p>
        </div>
        {runList.length > 0 && (
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="text-2xs text-text-muted uppercase tracking-wider">Total Runs</p>
              <p className="text-lg font-bold font-mono text-text-primary mt-0.5">{runList.length}</p>
            </div>
            {completedRuns.length > 0 && (
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider">Completed</p>
                <p className="text-lg font-bold font-mono text-profit mt-0.5">{completedRuns.length}</p>
              </div>
            )}
            {activeRuns > 0 && (
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider">Active</p>
                <p className="text-lg font-bold font-mono text-accent mt-0.5">{activeRuns}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── No strategies: guide user to create one first ─────── */}
      {strategyList.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface-1 flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto w-full">
          <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
            <FlaskConical size={20} className="text-text-muted" />
          </div>
          <h2 className="text-base font-bold text-text-primary mb-2">You need a strategy first</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6 max-w-xs">
            A backtest runs a strategy against historical market data. Create a
            strategy to get started — AI can write one for you in seconds.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/dashboard/ai-strategy"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              <Sparkles size={14} />Generate with AI
            </Link>
            <Link
              href="/dashboard/strategies/new"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-colors"
            >
              <Code2 size={14} />Write my own
            </Link>
          </div>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────── */}
      {strategyList.length > 0 && (
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Form — 3 cols */}
        <div className="xl:col-span-3">
          <Suspense fallback={null}>
            <BacktestForm strategies={strategyList} />
          </Suspense>
        </div>

        {/* Run history — 2 cols */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border overflow-hidden">

            {/* Panel header */}
            <div className="px-5 py-4 border-b border-border bg-surface-1 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Run History</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {runList.length === 0
                    ? "No runs yet"
                    : `${runList.length} run${runList.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              {completedRuns.length > 0 && (
                <Link
                  href="/dashboard/results"
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                >
                  View results →
                </Link>
              )}
            </div>

            {/* Empty state */}
            {runList.length === 0 && (
              <div className="bg-surface-0 px-5 py-14 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center mb-3">
                  <FlaskConical size={18} className="text-text-muted" />
                </div>
                <p className="text-sm text-text-secondary font-medium mb-1">No runs yet</p>
                <p className="text-xs text-text-muted">Submit a backtest to see it here.</p>
              </div>
            )}

            {/* Run list */}
            {runList.length > 0 && (
              <div className="divide-y divide-border bg-surface-0 max-h-[640px] overflow-y-auto">
                {runList.map((run) => {
                  const config = run.config as Record<string, unknown>;
                  const symbol = (config?.symbol as string) ?? "—";
                  const interval = (config?.interval as string) ?? "";
                  const runName = (config?.name as string) || symbol;
                  const strategyRef = run.strategies as Record<string, unknown> | null;
                  const strategyName = (strategyRef?.name as string) || null;

                  const results = run.results as Record<string, unknown> | null;
                  const metrics = results?.metrics as Record<string, number> | null;
                  const returnPct = run.status === "completed" ? metrics?.total_return_pct : undefined;

                  const duration =
                    run.started_at && run.completed_at
                      ? `${Math.round(
                          (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000
                        )}s`
                      : null;

                  const href = run.status === "completed"
                    ? `/dashboard/results/${run.id}`
                    : `/dashboard/backtests/${run.id}`;

                  const isClickable = ["completed", "running", "pending", "failed", "cancelled"].includes(run.status);
                  const Wrapper = isClickable ? Link : "div";
                  const wrapperProps = isClickable ? { href } : {};

                  return (
                    <Wrapper
                      key={run.id}
                      {...(wrapperProps as Record<string, string>)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 transition-colors group",
                        isClickable && "hover:bg-surface-1 cursor-pointer"
                      )}
                    >
                      {/* Status dot */}
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        run.status === "completed" ? "bg-profit" :
                        run.status === "running"   ? "bg-accent animate-pulse" :
                        run.status === "pending"   ? "bg-yellow-400 animate-pulse" :
                        run.status === "failed"    ? "bg-loss" :
                        "bg-surface-3"
                      )} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                            {runName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                            {symbol}
                          </span>
                          {interval && (
                            <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                              {interval}
                            </span>
                          )}
                          {strategyName && (
                            <span className="text-2xs text-text-muted truncate hidden sm:block">
                              · {strategyName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Return (completed only) */}
                      {returnPct !== undefined ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {returnPct >= 0
                            ? <TrendingUp size={11} className="text-profit" />
                            : <TrendingDown size={11} className="text-loss" />}
                          <span className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(returnPct))}>
                            {formatPercent(returnPct)}
                          </span>
                        </div>
                      ) : (
                        <StatusBadge status={run.status as BacktestStatus} />
                      )}

                      {/* Date */}
                      <div className="text-right shrink-0 hidden lg:block">
                        <p className="text-2xs text-text-muted">{formatDateTime(run.created_at)}</p>
                        {duration && (
                          <p className="text-2xs font-mono text-text-muted/60 mt-0.5">{duration}</p>
                        )}
                      </div>

                      {/* Error message */}
                      {run.error_message && (
                        <p className="text-2xs text-loss line-clamp-1 mt-1 col-span-full hidden">
                          {run.error_message}
                        </p>
                      )}
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
