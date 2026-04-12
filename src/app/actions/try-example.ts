"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BacktestRunRequest } from "@/types";

const EXAMPLE_NAME = "SMA Crossover (Example)";

const EXAMPLE_CODE = `class Strategy:
    def __init__(self, params):
        self.fast_period = params.get("fast_period", 10)
        self.slow_period = params.get("slow_period", 30)
        self.closes = []

    def on_bar(self, bar, portfolio):
        self.closes.append(bar["close"])

        if len(self.closes) < self.slow_period:
            return  # Not enough data yet

        fast_sma = sum(self.closes[-self.fast_period:]) / self.fast_period
        slow_sma = sum(self.closes[-self.slow_period:]) / self.slow_period

        symbol = bar["symbol"]
        position = portfolio.get_position(symbol)

        if fast_sma > slow_sma and position <= 0:
            portfolio.order_target_percent(symbol, 1.0)  # Fast MA above slow — go long
        elif fast_sma < slow_sma and position > 0:
            portfolio.order_target_percent(symbol, 0.0)  # Fast MA below slow — exit to cash
`;

/**
 * One-click demo path:
 *   1. Find or create the example strategy for this user
 *   2. Insert a pending backtest run (SPY, 1d, last 2 years)
 *   3. POST to the FastAPI engine
 *   4. Redirect to the live backtest status page
 */
export async function tryExampleAction(): Promise<{ error: string } | never> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // ── 1. Find or create example strategy ──────────────────────────────────
  let strategyId: string;

  const { data: existing } = await supabase
    .from("strategies")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", EXAMPLE_NAME)
    .maybeSingle();

  if (existing?.id) {
    strategyId = existing.id as string;
  } else {
    const { data: created, error: createErr } = await supabase
      .from("strategies")
      .insert({
        user_id: user.id,
        name: EXAMPLE_NAME,
        description:
          "A simple SMA crossover: buy when the 10-day average crosses above the 30-day average, sell when it crosses back below. A good first strategy to understand the basics.",
        code: EXAMPLE_CODE,
      })
      .select("id")
      .single();

    if (createErr || !created) return { error: "Failed to create example strategy." };
    strategyId = created.id as string;
  }

  // ── 2. Insert pending run ────────────────────────────────────────────────
  const runName = "SPY Daily — SMA Crossover Demo";
  const config = {
    strategy_id: strategyId,
    name: runName,
    symbol: "SPY",
    interval: "1d",
    start: null,
    end: null,
    entry: {},
    risk: {},
    params: { fast_period: 10, slow_period: 30 },
  };

  const { data: run, error: runErr } = await supabase
    .from("backtest_runs")
    .insert({
      user_id: user.id,
      strategy_id: strategyId,
      status: "pending",
      config: config as unknown as Record<string, unknown>,
    } as any)
    .select("id")
    .single();

  if (runErr || !run) return { error: "Failed to create backtest run." };

  // ── 3. POST to FastAPI ───────────────────────────────────────────────────
  const apiUrl = process.env.NEXT_PUBLIC_BACKTEST_API_URL || "http://localhost:8000";
  const { data: { session } } = await supabase.auth.getSession();

  const payload: BacktestRunRequest = {
    run_id: run.id as string,
    symbol: "SPY",
    interval: "1d",
    start: null,
    end: null,
    entry: {},
    risk: {},
    params: { fast_period: 10, slow_period: 30 },
    name: runName,
  };

  try {
    const apiRes = await fetch(`${apiUrl}/backtests/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const body = await apiRes.json().catch(() => null);
      const detail = (body?.detail as string) || apiRes.statusText;
      await supabase
        .from("backtest_runs")
        .update({ status: "failed", error_message: `API error: ${detail}` })
        .eq("id", run.id);
      return { error: `Backtest engine error: ${detail}` };
    }
  } catch {
    await supabase
      .from("backtest_runs")
      .update({ status: "failed", error_message: "Could not reach backtest engine." })
      .eq("id", run.id);
    return { error: "Could not connect to the backtest engine. Is it running?" };
  }

  // ── 4. Redirect to live status page ─────────────────────────────────────
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/backtests");
  redirect(`/dashboard/backtests/${run.id as string}`);
}
