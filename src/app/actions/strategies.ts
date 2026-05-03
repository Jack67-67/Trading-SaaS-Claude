"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StrategyConfig } from "@/types";

function parseConfig(formData: FormData): StrategyConfig {
  const symbol           = (formData.get("config_symbol") as string)?.trim().toUpperCase() || undefined;
  const execution_interval = (formData.get("config_execution_interval") as string) || undefined;
  const analysis_interval  = (formData.get("config_analysis_interval") as string) || undefined;
  const commission_raw   = formData.get("config_commission_pct") as string;
  const slippage_raw     = formData.get("config_slippage_pct") as string;
  const capital_raw      = formData.get("config_initial_capital") as string;

  const commission_pct   = commission_raw !== "" && commission_raw != null ? parseFloat(commission_raw) : undefined;
  const slippage_pct     = slippage_raw   !== "" && slippage_raw   != null ? parseFloat(slippage_raw)   : undefined;
  const initial_capital  = capital_raw    !== "" && capital_raw    != null ? parseFloat(capital_raw)    : undefined;

  const cfg: StrategyConfig = {};
  if (symbol)             cfg.symbol             = symbol;
  if (execution_interval) cfg.execution_interval = execution_interval;
  // Only store analysis_interval when it's different from execution_interval
  if (analysis_interval && analysis_interval !== execution_interval) {
    cfg.analysis_interval = analysis_interval;
  }
  if (commission_pct  != null && !isNaN(commission_pct))  cfg.commission_pct  = commission_pct;
  if (slippage_pct    != null && !isNaN(slippage_pct))    cfg.slippage_pct    = slippage_pct;
  if (initial_capital != null && !isNaN(initial_capital)) cfg.initial_capital = initial_capital;

  return cfg;
}

export async function createStrategy(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const code = formData.get("code") as string;

  if (!name?.trim()) return { error: "Strategy name is required." };
  if (!code?.trim()) return { error: "Strategy code cannot be empty." };

  const config = parseConfig(formData);

  const { data, error } = await (supabase as any)
    .from("strategies")
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      code,
      config: Object.keys(config).length > 0 ? config : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/strategies");
  revalidatePath("/dashboard");
  redirect(`/dashboard/strategies/${data.id}`);
}

export async function updateStrategy(strategyId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const code = formData.get("code") as string;

  if (!name?.trim()) return { error: "Strategy name is required." };

  const config = parseConfig(formData);

  const { error } = await (supabase as any)
    .from("strategies")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      code,
      config: Object.keys(config).length > 0 ? config : null,
    })
    .eq("id", strategyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/strategies");
  revalidatePath(`/dashboard/strategies/${strategyId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStrategy(strategyId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("strategies")
    .delete()
    .eq("id", strategyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/strategies");
  revalidatePath("/dashboard");
  redirect("/dashboard/strategies");
}
