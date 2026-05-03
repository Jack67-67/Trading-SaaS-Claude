"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BacktestRunRequest } from "@/types";

export async function submitBacktestAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const strategyId = formData.get("strategy_id") as string;
  const name = formData.get("name") as string;
  const symbol = formData.get("symbol") as string;
  const interval = formData.get("interval") as string;
  const analysisIntervalRaw = (formData.get("analysis_interval") as string) || "";
  const analysis_interval = analysisIntervalRaw && analysisIntervalRaw !== interval
    ? analysisIntervalRaw : null;
  const start = (formData.get("start") as string) || null;
  const end = (formData.get("end") as string) || null;
  const entryRaw = formData.get("entry") as string;
  const riskRaw = formData.get("risk") as string;
  const paramsRaw = formData.get("params") as string;
  const commissionPct = Math.max(0, Math.min(5, parseFloat((formData.get("commission_pct") as string) || "0"))) || 0;
  const slippagePct = Math.max(0, Math.min(5, parseFloat((formData.get("slippage_pct") as string) || "0"))) || 0;

  // ─── Validation ───────────────────────────────────────────
  const errors: string[] = [];
  if (!strategyId) errors.push("Select a strategy.");
  if (!name?.trim()) errors.push("Backtest name is required.");
  if (!symbol) errors.push("Select a symbol.");
  if (!interval) errors.push("Select an interval.");
  if (start && end && new Date(start) >= new Date(end)) {
    errors.push("Start date must be before end date.");
  }

  let entry: Record<string, unknown> = {};
  let risk: Record<string, unknown> = {};
  let params: Record<string, unknown> = {};

  try { entry = entryRaw ? JSON.parse(entryRaw) : {}; }
  catch { errors.push("Entry config is not valid JSON."); }

  try { risk = riskRaw ? JSON.parse(riskRaw) : {}; }
  catch { errors.push("Risk config is not valid JSON."); }

  try { params = paramsRaw ? JSON.parse(paramsRaw) : {}; }
  catch { errors.push("Params config is not valid JSON."); }

  if (errors.length > 0) return { error: errors.join(" ") };

  // ─── Verify strategy belongs to user ──────────────────────
  const { data: strategy, error: strategyError } = await supabase
    .from("strategies")
    .select("id, name")
    .eq("id", strategyId)
    .eq("user_id", user.id)
    .single();

  if (strategyError || !strategy) return { error: "Strategy not found." };

  // ─── Build config (stored in Supabase for display) ────────
  const config = {
    strategy_id: strategyId, name, symbol,
    interval,
    ...(analysis_interval ? { analysis_interval } : {}),
    start, end, entry, risk, params,
    commission_pct: commissionPct, slippage_pct: slippagePct,
  };

  // ─── Insert pending run in Supabase ───────────────────────
  const t0 = Date.now();
  const { data: run, error: insertError } = await supabase
    .from("backtest_runs")
    .insert({
      user_id: user.id,
      strategy_id: strategyId,
      status: "pending",
      config: config as unknown as Record<string, unknown>,
    } as any)
    .select("id")
    .single();

  if (insertError) return { error: `Failed to create backtest: ${insertError.message}` };
  console.log(`[backtest] db_insert=${Date.now() - t0}ms run=${run.id}`);

  // ─── POST to FastAPI: /backtests/run ──────────────────────
  const apiUrl = process.env.NEXT_PUBLIC_BACKTEST_API_URL || "http://localhost:8000";
  const { data: { session } } = await supabase.auth.getSession();

  const payload: BacktestRunRequest = {
    run_id: run.id,
    symbol,
    interval,
    ...(analysis_interval ? { analysis_interval } : {}),
    start,
    end,
    entry,
    risk,
    params,
    name,
    commission_pct: commissionPct,
    slippage_pct: slippagePct,
  };

  const t1 = Date.now();
  try {
    const apiRes = await fetch(`${apiUrl}/backtests/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    console.log(`[backtest] api_dispatch=${Date.now() - t1}ms status=${apiRes.status} run=${run.id}`);

    if (!apiRes.ok) {
      const errorBody = await apiRes.json().catch(() => null);
      const detail = errorBody?.detail || apiRes.statusText;

      await supabase.from("backtest_runs").update({
        status: "failed",
        error_message: `API error: ${detail}`,
      }).eq("id", run.id);

      return { error: `Backtest engine error: ${detail}` };
    }
  } catch (err) {
    console.log(`[backtest] api_dispatch=${Date.now() - t1}ms ERROR run=${run.id}`);
    await supabase.from("backtest_runs").update({
      status: "failed",
      error_message: "Could not reach backtest engine. Is it running?",
    }).eq("id", run.id);

    return { error: "Could not connect to the backtest engine. Please try again later." };
  }
  console.log(`[backtest] total_submit=${Date.now() - t0}ms run=${run.id}`);

  revalidatePath("/dashboard/backtests");
  revalidatePath("/dashboard");
  redirect(`/dashboard/backtests/${run.id}`);
}
