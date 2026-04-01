import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BacktestForm } from "@/components/dashboard/backtest-form";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types";

export const metadata: Metadata = {
  title: "Backtests",
};

export default async function BacktestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch strategies for the form picker
  const { data: strategies } = await supabase
    .from("strategies")
    .select("id, name, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  // Fetch all backtest runs
  const { data: runs } = await supabase
    .from("backtest_runs")
    .select("*, strategies(name)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const runList = runs ?? [];
  const strategyList = strategies ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Backtests
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Run strategies against historical market data and track execution.
        </p>
      </div>

      {/* Two-column: form left, run history right */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form — takes 3 cols on xl */}
        <div className="xl:col-span-3">
          <Suspense fallback={null}>
            <BacktestForm strategies={strategyList} />
          </Suspense>
        </div>

        {/* Run history — takes 2 cols on xl */}
        <div className="xl:col-span-2">
          <Card padding="none">
            <CardHeader className="px-5 pt-5 pb-0">
              <CardTitle>Run History</CardTitle>
              <span className="text-2xs text-text-muted font-mono">
                {runList.length} run{runList.length !== 1 ? "s" : ""}
              </span>
            </CardHeader>

            {runList.length === 0 ? (
              <div className="p-5">
                <div className="rounded-lg border border-dashed border-border py-10 flex flex-col items-center text-center">
                  <p className="text-sm text-text-secondary">No runs yet</p>
                  <p className="text-xs text-text-muted mt-1">
                    Submit a backtest to see it here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
                {runList.map((run) => {
                  const config = run.config as Record<string, unknown>;
                  const symbol = (config?.symbol as string) ?? "—";
                  const interval = (config?.interval as string) ?? "";
                  const strategyName =
                    (run as Record<string, unknown>).strategies &&
                    typeof (run as Record<string, unknown>).strategies ===
                      "object"
                      ? ((run as Record<string, unknown>).strategies as Record<string, unknown>)
                          ?.name as string
                      : null;

                  const duration =
                    run.started_at && run.completed_at
                      ? `${Math.round(
                          (new Date(run.completed_at).getTime() -
                            new Date(run.started_at).getTime()) /
                            1000
                        )}s`
                      : null;

                  const isClickable =
                    run.status === "completed" ||
                    run.status === "running" ||
                    run.status === "pending" ||
                    run.status === "failed" ||
                    run.status === "cancelled";

                  const Wrapper = isClickable ? Link : "div";
                  const wrapperProps = isClickable
                    ? { href: `/dashboard/backtests/${run.id}` }
                    : {};

                  return (
                    <Wrapper
                      key={run.id}
                      {...(wrapperProps as Record<string, string>)}
                      className={cn(
                        "block px-5 py-3.5 transition-colors",
                        isClickable &&
                          "hover:bg-surface-2/50 cursor-pointer"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-text-primary font-mono">
                            {symbol}
                          </span>
                          <span className="text-2xs text-text-muted">
                            {interval}
                          </span>
                        </div>
                        <StatusBadge
                          status={run.status as BacktestStatus}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-2xs text-text-muted truncate max-w-[180px]">
                          {strategyName || run.strategy_id.slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-2 text-2xs text-text-muted shrink-0">
                          {duration && (
                            <span className="font-mono">{duration}</span>
                          )}
                          <span>{formatDateTime(run.created_at)}</span>
                        </div>
                      </div>
                      {run.error_message && (
                        <p className="text-2xs text-loss mt-1.5 line-clamp-1">
                          {run.error_message}
                        </p>
                      )}
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
