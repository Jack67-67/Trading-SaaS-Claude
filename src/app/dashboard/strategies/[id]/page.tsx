import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StrategyForm } from "@/components/dashboard/strategy-form";
import { AiAlerts } from "@/components/dashboard/ai-alerts";
import { TrendBadge } from "@/components/dashboard/run-comparison";
import { generateAlerts } from "@/lib/alerts";
import { computeStrategyTrend } from "@/lib/trends";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from("strategies")
    .select("name")
    .eq("id", params.id)
    .single();

  return { title: data?.name ?? "Edit Strategy" };
}

export default async function StrategyEditorPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: strategy, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (error || !strategy) {
    notFound();
  }

  // Fetch completed runs for this strategy to generate alerts
  const { data: strategyRuns } = await supabase
    .from("backtest_runs")
    .select("id, results, completed_at, started_at, config")
    .eq("strategy_id", params.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

  const alertRunInputs = (strategyRuns ?? []).flatMap((r) => {
    const m = (r.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
    const cfg = r.config as Record<string, unknown> | null;
    if (!m || m.total_return_pct === undefined || m.sharpe_ratio === undefined) return [];
    return [{
      id: r.id as string,
      strategyId: params.id,
      strategyName: strategy.name,
      symbol: (cfg?.symbol as string) || "—",
      completedAt: (r.completed_at as string) || (r.started_at as string) || new Date().toISOString(),
      returnPct: m.total_return_pct,
      sharpe: m.sharpe_ratio,
      drawdown: Math.abs(m.max_drawdown_pct ?? 0),
      trades: m.total_trades ?? 0,
      winRate: m.win_rate_pct ?? 0,
    }];
  });
  const strategyAlerts = generateAlerts(alertRunInputs);

  const trendSnapshots = alertRunInputs.map((r) => ({
    returnPct: r.returnPct, sharpe: r.sharpe, drawdown: r.drawdown,
    winRate: r.winRate, trades: r.trades,
  }));
  const trend = computeStrategyTrend(trendSnapshots);

  return (
    <div className="space-y-5">
      {/* Strategy header with trend */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {(strategy as Record<string, unknown> & { name?: string }).name ?? "Strategy"}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {alertRunInputs.length > 0
              ? `${alertRunInputs.length} completed ${alertRunInputs.length === 1 ? "run" : "runs"}`
              : "No completed runs yet"}
          </p>
        </div>
        {trend && <TrendBadge trend={trend} />}
      </div>

      {strategyAlerts.length > 0 && (
        <AiAlerts alerts={strategyAlerts} variant="compact" />
      )}
      <StrategyForm
        mode="edit"
        strategyId={strategy.id}
        initialData={{
          name: strategy.name,
          description: strategy.description,
          code: strategy.code,
        }}
      />
    </div>
  );
}
