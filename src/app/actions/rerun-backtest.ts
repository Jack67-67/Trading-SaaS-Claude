"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BacktestConfig, BacktestRunRequest } from "@/types";

export async function rerunBacktestAction(originalRunId: string): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: original, error: fetchError } = await supabase
    .from("backtest_runs")
    .select("config, strategy_id")
    .eq("id", originalRunId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) return { error: "Run not found." };

  const config = original.config as unknown as BacktestConfig;

  const { data: run, error: insertError } = await supabase
    .from("backtest_runs")
    .insert({
      user_id: user.id,
      strategy_id: original.strategy_id,
      status: "pending",
      config: original.config as unknown as Record<string, unknown>,
    } as any)
    .select("id")
    .single();

  if (insertError) return { error: `Failed to create backtest: ${insertError.message}` };

  const apiUrl = process.env.NEXT_PUBLIC_BACKTEST_API_URL || "http://localhost:8000";
  const { data: { session } } = await supabase.auth.getSession();

  const payload: BacktestRunRequest = {
    run_id: run.id,
    symbol: config.symbol,
    interval: config.interval,
    ...(config.analysis_interval ? { analysis_interval: config.analysis_interval } : {}),
    start: config.start,
    end: config.end,
    entry: config.entry ?? {},
    risk: config.risk ?? {},
    params: config.params ?? {},
    name: config.name,
    commission_pct: config.commission_pct,
    slippage_pct: config.slippage_pct,
  };

  try {
    const apiRes = await fetch(`${apiUrl}/backtests/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const errorBody = await apiRes.json().catch(() => null);
      const detail = errorBody?.detail || apiRes.statusText;
      await supabase.from("backtest_runs").update({
        status: "failed",
        error_message: `API error: ${detail}`,
      }).eq("id", run.id);
      return { error: `Backtest engine error: ${detail}` };
    }
  } catch {
    await supabase.from("backtest_runs").update({
      status: "failed",
      error_message: "Could not reach backtest engine.",
    }).eq("id", run.id);
    return { error: "Could not connect to the backtest engine." };
  }

  revalidatePath("/dashboard/backtests");
  revalidatePath("/dashboard");
  redirect(`/dashboard/backtests/${run.id}`);
}
