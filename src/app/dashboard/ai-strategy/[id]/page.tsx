import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AiStrategyResultView } from "@/components/dashboard/ai-strategy-result-view";
import type { BacktestRun } from "@/types";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata() {
  return { title: "AI Strategy Results" };
}

export default async function AiStrategyResultPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rawRun, error } = await supabase
    .from("backtest_runs")
    .select("*, strategies(name, code)")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (error || !rawRun) notFound();

  const run = rawRun as unknown as BacktestRun & { strategies: Record<string, unknown> | null };
  const strategyRef = run.strategies;
  const strategyName = (strategyRef?.name as string) || "AI Strategy";
  const strategyCode = (strategyRef?.code as string) || "";

  return (
    <AiStrategyResultView
      initialRun={run as unknown as BacktestRun & Record<string, unknown>}
      strategyName={strategyName}
      strategyCode={strategyCode}
    />
  );
}
