import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BacktestDetailView } from "@/components/dashboard/backtest-detail-view";
import type { BacktestRun, BacktestConfig } from "@/types";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from("backtest_runs")
    .select("config")
    .eq("id", params.id)
    .single();

  const config = data?.config as Record<string, unknown> | null;
  const symbol = (config?.symbol as string) || "Backtest";
  return { title: `${symbol} — Backtest Run` };
}

export default async function BacktestDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: run, error } = await supabase
    .from("backtest_runs")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (error || !run) {
    notFound();
  }

  const { data: strategy } = await supabase
    .from("strategies")
    .select("name")
    .eq("id", run.strategy_id)
    .single();

  const typedRun: BacktestRun = {
    id: run.id,
    user_id: run.user_id,
    strategy_id: run.strategy_id,
    status: run.status as BacktestRun["status"],
    config: run.config as unknown as BacktestConfig,
    results: (run.results as Record<string, unknown>) ?? null,
    created_at: run.created_at,
    started_at: run.started_at,
    completed_at: run.completed_at,
    error_message: run.error_message,
  };

  return (
    <BacktestDetailView
      initialRun={typedRun}
      strategyName={strategy?.name ?? null}
    />
  );
}
