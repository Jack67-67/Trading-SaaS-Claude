"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface CreateSessionInput {
  strategyId: string;
  name: string;
  symbol: string;
  interval: string;
  startDate: string; // ISO date "YYYY-MM-DD"
  params: Record<string, unknown>;
  risk: Record<string, unknown>;
  commissionPct: number;
  slippagePct: number;
  initialCapital: number;
}

export async function createPaperTradingSession(
  input: CreateSessionInput
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("paper_trade_sessions")
    .insert({
      strategy_id:     input.strategyId,
      name:            input.name,
      symbol:          input.symbol.toUpperCase(),
      interval:        input.interval,
      start_date:      input.startDate,
      params:          input.params,
      risk:            input.risk,
      commission_pct:  input.commissionPct,
      slippage_pct:    input.slippagePct,
      initial_capital: input.initialCapital,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create session" };

  // Trigger first refresh immediately
  try {
    await fetch(`${BACKEND_URL}/paper-trade/run`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        session_id:      data.id,
        strategy_id:     input.strategyId,
        symbol:          input.symbol.toUpperCase(),
        interval:        input.interval,
        start:           input.startDate,
        params:          input.params,
        risk:            input.risk,
        commission_pct:  input.commissionPct,
        slippage_pct:    input.slippagePct,
        initial_capital: input.initialCapital,
      }),
    });
  } catch {
    // If first refresh fails the session still exists; user can retry
  }

  revalidatePath("/dashboard/paper-trading");
  redirect(`/dashboard/paper-trading/${data.id}`);
}

export async function refreshPaperTradingSession(
  sessionId: string
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const { data: sess, error: sessErr } = await supabase
    .from("paper_trade_sessions")
    .select("strategy_id, symbol, interval, start_date, params, risk, commission_pct, slippage_pct, initial_capital")
    .eq("id", sessionId)
    .single();

  if (sessErr || !sess) return { error: sessErr?.message ?? "Session not found" };

  const res = await fetch(`${BACKEND_URL}/paper-trade/run`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      session_id:      sessionId,
      strategy_id:     sess.strategy_id,
      symbol:          sess.symbol,
      interval:        sess.interval,
      start:           sess.start_date,
      params:          sess.params ?? {},
      risk:            sess.risk ?? {},
      commission_pct:  sess.commission_pct,
      slippage_pct:    sess.slippage_pct,
      initial_capital: sess.initial_capital,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string };
    return { error: body.detail ?? "Refresh failed" };
  }

  revalidatePath(`/dashboard/paper-trading/${sessionId}`);
  revalidatePath("/dashboard/paper-trading");
}
