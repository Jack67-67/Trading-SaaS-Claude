"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TradingMode = "paper" | "shadow" | "live_prep";

// ── Set trading mode ──────────────────────────────────────────────────────────
// Paper → no signals. Shadow → signals visible. Live Prep → full preview.
// Going from shadow→live_prep also keeps autotrading_enabled true.
// Going back to paper turns autotrading off.

export async function setTradingMode(
  sessionId: string,
  mode: TradingMode,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  // Server-side transition guard: live_prep requires shadow first + broker linked
  if (mode === "live_prep") {
    type SessCheck = { trading_mode: string | null; broker_connection_id: string | null };
    const { data: current } = await supabase
      .from("paper_trade_sessions")
      .select("trading_mode, broker_connection_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single() as unknown as { data: SessCheck | null };

    if (!current) return { error: "Session not found" };
    if (current.trading_mode !== "shadow") {
      return { error: "Must be in Shadow mode before enabling Live Prep" };
    }
    if (!current.broker_connection_id) {
      return { error: "A broker connection must be linked before enabling Live Prep" };
    }
  }

  const autoEnabled   = mode === "shadow" || mode === "live_prep";
  const livePrepAt    = mode === "live_prep" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({
      trading_mode:         mode,
      autotrading_enabled:  autoEnabled,
      last_action:          `mode_${mode}`,
      last_action_at:       new Date().toISOString(),
      ...(mode === "live_prep" ? { live_prep_enabled_at: livePrepAt } : {}),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .neq("status", "stopped");

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/autotrading/${sessionId}`);
  revalidatePath("/dashboard/autotrading");
}

// ── Link a broker connection to a session ─────────────────────────────────────

export async function linkBrokerToSession(
  sessionId: string,
  brokerConnectionId: string | null,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  // Verify the broker belongs to this user (if not null)
  if (brokerConnectionId) {
    const db = supabase as any;
    const { data: conn } = await db
      .from("broker_connections")
      .select("id")
      .eq("id", brokerConnectionId)
      .eq("user_id", user.id)
      .single();
    if (!conn) return { error: "Broker connection not found" };
  }

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({ broker_connection_id: brokerConnectionId })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/autotrading/${sessionId}`);
}
