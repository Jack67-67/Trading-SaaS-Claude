"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PortfolioControls } from "@/lib/portfolio-risk";

export interface PortfolioRow {
  id:                        string;
  name:                      string;
  status:                    "active" | "paused" | "stopped";
  pause_reason:              string | null;
  kill_switch_at:            string | null;
  max_portfolio_risk_pct:    number;
  max_risk_per_strategy_pct: number;
  max_simultaneous_trades:   number;
  max_weekly_loss_pct:       number;
  max_monthly_loss_pct:      number;
  pause_on_events:           boolean;
  created_at:                string;
}

/** Get or auto-create the user's single portfolio */
export async function getOrCreatePortfolio(): Promise<{ error: string } | PortfolioRow> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("autotrading_portfolios")
    .select("id, name, status, pause_reason, kill_switch_at, max_portfolio_risk_pct, max_risk_per_strategy_pct, max_simultaneous_trades, max_weekly_loss_pct, max_monthly_loss_pct, pause_on_events, created_at")
    .eq("user_id", user.id)
    .single();

  if (existing) return existing as unknown as PortfolioRow;

  const { data: created, error: createErr } = await supabase
    .from("autotrading_portfolios")
    .insert({ user_id: user.id, name: "My Portfolio" })
    .select("id, name, status, pause_reason, kill_switch_at, max_portfolio_risk_pct, max_risk_per_strategy_pct, max_simultaneous_trades, max_weekly_loss_pct, max_monthly_loss_pct, pause_on_events, created_at")
    .single();

  if (createErr || !created) return { error: createErr?.message ?? "Failed to create portfolio" };
  return created as unknown as PortfolioRow;
}

export async function updatePortfolioControls(
  portfolioId: string,
  controls: PortfolioControls,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  if (controls.maxPortfolioRiskPct < 1 || controls.maxPortfolioRiskPct > 100)
    return { error: "Portfolio risk must be 1–100%" };
  if (controls.maxRiskPerStrategyPct < 1 || controls.maxRiskPerStrategyPct > 50)
    return { error: "Per-strategy risk must be 1–50%" };
  if (controls.maxSimultaneousTrades < 1 || controls.maxSimultaneousTrades > 50)
    return { error: "Max simultaneous trades must be 1–50" };
  if (controls.maxWeeklyLossPct < 1 || controls.maxWeeklyLossPct > 50)
    return { error: "Weekly loss limit must be 1–50%" };
  if (controls.maxMonthlyLossPct < 1 || controls.maxMonthlyLossPct > 80)
    return { error: "Monthly loss limit must be 1–80%" };

  const { error } = await supabase
    .from("autotrading_portfolios")
    .update({
      max_portfolio_risk_pct:    controls.maxPortfolioRiskPct,
      max_risk_per_strategy_pct: controls.maxRiskPerStrategyPct,
      max_simultaneous_trades:   controls.maxSimultaneousTrades,
      max_weekly_loss_pct:       controls.maxWeeklyLossPct,
      max_monthly_loss_pct:      controls.maxMonthlyLossPct,
      pause_on_events:           controls.pauseOnEvents,
      updated_at:                new Date().toISOString(),
    })
    .eq("id", portfolioId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/autotrading/portfolio");
  revalidatePath("/dashboard/autotrading");
}

/** Portfolio-wide kill switch — stops ALL active sessions */
export async function portfolioKillSwitch(
  portfolioId: string,
): Promise<{ error: string } | { stopped: number }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const now = new Date().toISOString();

  const { data: updated, error: sessErr } = await supabase
    .from("paper_trade_sessions")
    .update({
      status:              "stopped",
      autotrading_enabled: false,
      pause_reason:        "Portfolio kill switch activated",
      last_action:         "portfolio_kill_switch",
      last_action_at:      now,
    })
    .eq("user_id", user.id)
    .neq("status", "stopped")
    .select("id");

  if (sessErr) return { error: sessErr.message };

  await supabase
    .from("autotrading_portfolios")
    .update({ status: "stopped", kill_switch_at: now, updated_at: now })
    .eq("id", portfolioId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/autotrading");
  revalidatePath("/dashboard/autotrading/portfolio");
  return { stopped: updated?.length ?? 0 };
}

/** Link a session to this portfolio (called from portfolio page or session setup) */
export async function linkSessionToPortfolio(
  sessionId: string,
  portfolioId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("paper_trade_sessions")
    .update({ portfolio_id: portfolioId })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/autotrading");
  revalidatePath("/dashboard/autotrading/portfolio");
}
