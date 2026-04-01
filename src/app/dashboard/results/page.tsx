import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import type { BacktestStatus } from "@/types";

export const metadata: Metadata = {
  title: "Results",
};

export default async function ResultsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch completed runs
  const { data: runs } = await supabase
    .from("backtest_runs")
    .select("*, strategies(name)")
    .eq("user_id", user!.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(50);

  const items = runs ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Results
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Analyze performance metrics, equity curves, and trade logs from
          completed backtests.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">
            No completed backtests yet
          </p>
          <p className="text-xs text-text-muted max-w-xs mb-5">
            Run a backtest from the Backtests page. Completed results will
            appear here with full analytics.
          </p>
          <Link
            href="/dashboard/backtests"
            className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Go to Backtests →
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Strategy
                </th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((run) => {
                const config = run.config as Record<string, unknown>;
                const strategyRef = run.strategies as Record<
                  string,
                  unknown
                > | null;

                return (
                  <tr
                    key={run.id}
                    className="hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/results/${run.id}`}
                        className="text-sm font-medium font-mono text-text-primary hover:text-accent transition-colors"
                      >
                        {(config?.symbol as string) || "—"}
                      </Link>
                      <p className="text-2xs text-text-muted">
                        {(config?.interval as string) || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {(strategyRef?.name as string) || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {(config?.start as string) || "Auto"} →{" "}
                      {(config?.end as string) || "Auto"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-[200px]">
                      {(config?.name as string) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={run.status as BacktestStatus}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {run.completed_at
                        ? formatDateTime(run.completed_at)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
