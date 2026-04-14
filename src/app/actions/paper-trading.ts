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
): Promise<{ error: string } | { sessionId: string }> {
  const supabase = createClient();

  // getUser() validates the JWT server-side — required in server actions
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[paper-trading] getUser failed:", userError?.message);
    return { error: "Not authenticated" };
  }

  // Need the session token to forward to the backend
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "No active session" };

  console.log("[paper-trading] inserting session for user:", user.id);

  const { data, error } = await supabase
    .from("paper_trade_sessions")
    .insert({
      user_id:         user.id,
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

  if (error || !data) {
    console.error("[paper-trading] insert error:", error?.message, error?.details);
    return { error: error?.message ?? "Failed to create session" };
  }

  console.log("[paper-trading] session created:", data.id);

  // Trigger first refresh immediately — non-fatal if it fails
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
  } catch (fetchErr) {
    console.error("[paper-trading] initial refresh failed (non-fatal):", fetchErr);
  }

  revalidatePath("/dashboard/paper-trading");
  // Return ID to client — client handles navigation to avoid redirect() throwing in useTransition
  return { sessionId: data.id };
}

export async function refreshPaperTradingSession(
  sessionId: string
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated" };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "No active session" };

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
