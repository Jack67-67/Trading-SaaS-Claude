import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StrategyForm } from "@/components/dashboard/strategy-form";
import { AiAlerts } from "@/components/dashboard/ai-alerts";
import { generateAlerts } from "@/lib/alerts";

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

  return (
    <div className="space-y-5">
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
