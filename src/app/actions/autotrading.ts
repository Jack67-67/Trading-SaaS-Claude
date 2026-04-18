"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTodayGuard } from "@/lib/economic-calendar";

export interface SafetyControls {
  maxCapitalPct: number;
  maxWeeklyLossPct: number;
  maxMonthlyLossPct: number;
  pauseOnEvents: boolean;
}

// ── Toggle autotrading on/off ────────────────────────────────────────────────

export async function toggleAutotrading(
  sessionId: string,
  enabled: boolean,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({
      autotrading_enabled: enabled,
      last_action: enabled ? "autotrading_on" : "autotrading_off",
      last_action_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .neq("status", "stopped");

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/paper-trading/${sessionId}`);
}

// ── Update safety limits ─────────────────────────────────────────────────────

export async function updateSafetyControls(
  sessionId: string,
  controls: SafetyControls,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  // Validate ranges
  if (controls.maxCapitalPct < 1 || controls.maxCapitalPct > 100) {
    return { error: "Capital allocation must be between 1 and 100" };
  }
  if (controls.maxWeeklyLossPct < 1 || controls.maxWeeklyLossPct > 50) {
    return { error: "Weekly loss limit must be between 1 and 50" };
  }
  if (controls.maxMonthlyLossPct < 1 || controls.maxMonthlyLossPct > 80) {
    return { error: "Monthly loss limit must be between 1 and 80" };
  }

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({
      max_capital_pct:      controls.maxCapitalPct,
      max_weekly_loss_pct:  controls.maxWeeklyLossPct,
      max_monthly_loss_pct: controls.maxMonthlyLossPct,
      pause_on_events:      controls.pauseOnEvents,
      last_action:          "controls_updated",
      last_action_at:       new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/paper-trading/${sessionId}`);
}

// ── Pause a session (manual or automated) ───────────────────────────────────

export async function pauseSession(
  sessionId: string,
  reason: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({
      status:         "paused",
      pause_reason:   reason,
      last_action:    "paused",
      last_action_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .neq("status", "stopped");

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/paper-trading/${sessionId}`);
  revalidatePath("/dashboard/paper-trading");
}

// ── Resume a paused session ──────────────────────────────────────────────────

export async function resumeSession(
  sessionId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({
      status:         "active",
      pause_reason:   null,
      last_action:    "resumed",
      last_action_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "paused");

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/paper-trading/${sessionId}`);
  revalidatePath("/dashboard/paper-trading");
}

// ── Kill switch — terminal stop ──────────────────────────────────────────────

export async function killSwitch(
  sessionId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({
      status:              "stopped",
      autotrading_enabled: false,
      pause_reason:        "Kill switch activated",
      last_action:         "kill_switch",
      last_action_at:      new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/paper-trading/${sessionId}`);
  revalidatePath("/dashboard/paper-trading");
}

// ── Run safety checks after each refresh ────────────────────────────────────

type EquityPoint = { timestamp: string; equity: number };

function findEquityAtOffset(curve: EquityPoint[], targetMs: number): number | null {
  let best: EquityPoint | null = null;
  for (const pt of curve) {
    if (new Date(pt.timestamp).getTime() <= targetMs) best = pt;
    else break;
  }
  return best?.equity ?? null;
}

interface SafetyCheckResult {
  paused: boolean;
  reason?: string;
}

export async function runSafetyChecks(
  sessionId: string,
): Promise<SafetyCheckResult | { error: string }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  type SessRow = {
    status: string;
    autotrading_enabled: boolean;
    max_weekly_loss_pct: number;
    max_monthly_loss_pct: number;
    pause_on_events: boolean;
    last_results: Record<string, unknown> | null;
  };

  const { data: sess, error: sessErr } = await supabase
    .from("paper_trade_sessions")
    .select("status, autotrading_enabled, max_weekly_loss_pct, max_monthly_loss_pct, pause_on_events, last_results")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single() as unknown as { data: SessRow | null; error: unknown };

  if (sessErr || !sess) return { error: "Session not found" };

  // Only guard active autotrading sessions
  if (sess.status !== "active" || !sess.autotrading_enabled) {
    return { paused: false };
  }

  const curve = ((sess.last_results?.equity_curve ?? []) as EquityPoint[]);
  if (curve.length < 2) return { paused: false };

  const currentEquity = curve[curve.length - 1].equity;
  const now = Date.now();
  const DAY_MS = 86_400_000;

  // Weekly loss check
  const equity7d = findEquityAtOffset(curve, now - 7 * DAY_MS);
  if (equity7d !== null && equity7d > 0) {
    const weeklyLoss = ((currentEquity - equity7d) / equity7d) * 100;
    if (weeklyLoss < -sess.max_weekly_loss_pct) {
      const reason = `Weekly loss limit hit: ${weeklyLoss.toFixed(1)}% (limit −${sess.max_weekly_loss_pct}%)`;
      await pauseSession(sessionId, reason);
      return { paused: true, reason };
    }
  }

  // Monthly loss check
  const equity30d = findEquityAtOffset(curve, now - 30 * DAY_MS);
  if (equity30d !== null && equity30d > 0) {
    const monthlyLoss = ((currentEquity - equity30d) / equity30d) * 100;
    if (monthlyLoss < -sess.max_monthly_loss_pct) {
      const reason = `Monthly loss limit hit: ${monthlyLoss.toFixed(1)}% (limit −${sess.max_monthly_loss_pct}%)`;
      await pauseSession(sessionId, reason);
      return { paused: true, reason };
    }
  }

  // Event guard check
  if (sess.pause_on_events) {
    const guard = getTodayGuard();
    if (guard?.level === "danger") {
      const names = guard.events.map((e) => e.short).join(", ");
      const reason = `Auto-paused: major market event — ${names}`;
      await pauseSession(sessionId, reason);
      return { paused: true, reason };
    }
  }

  return { paused: false };
}
