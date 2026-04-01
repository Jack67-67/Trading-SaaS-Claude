import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import type { BacktestStatus } from "@/types";
import type { Database } from "@/types/supabase";

type BacktestRow = Database["public"]["Tables"]["backtest_runs"]["Row"];

interface RecentBacktestsProps {
  runs: BacktestRow[];
}

export function RecentBacktests({ runs }: RecentBacktestsProps) {
  if (runs.length === 0) {
    return (
      <div className="px-5 pb-5">
        <div className="rounded-lg border border-dashed border-border py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          </div>
          <p className="text-sm text-text-secondary font-medium">
            No backtests yet
          </p>
          <p className="text-xs text-text-muted mt-1">
            Create a strategy and run your first backtest to see results here.
          </p>
          <Link
            href="/dashboard/strategies"
            className="mt-4 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Create a strategy →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
              Strategy
            </th>
            <th className="px-5 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
              Status
            </th>
            <th className="px-5 py-2.5 text-left text-2xs font-semibold text-text-muted uppercase tracking-wider">
              Created
            </th>
            <th className="px-5 py-2.5 text-right text-2xs font-semibold text-text-muted uppercase tracking-wider">
              Duration
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {runs.map((run) => {
            const config = run.config as Record<string, unknown>;
            const symbol = (config?.symbol as string) ?? "—";
            const duration =
              run.started_at && run.completed_at
                ? `${Math.round(
                    (new Date(run.completed_at).getTime() -
                      new Date(run.started_at).getTime()) /
                      1000
                  )}s`
                : "—";

            return (
              <tr
                key={run.id}
                className="hover:bg-surface-2/50 transition-colors"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/dashboard/results/${run.id}`}
                    className="text-sm text-text-primary hover:text-accent transition-colors font-medium"
                  >
                    {symbol}
                  </Link>
                  <p className="text-2xs text-text-muted font-mono mt-0.5">
                    {run.strategy_id.slice(0, 8)}…
                  </p>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={run.status as BacktestStatus} />
                </td>
                <td className="px-5 py-3 text-sm text-text-secondary">
                  {formatDateTime(run.created_at)}
                </td>
                <td className="px-5 py-3 text-right text-sm text-text-secondary font-mono">
                  {duration}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
