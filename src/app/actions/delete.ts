"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deletePaperSession(
  sessionId: string
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const getUserResult = await supabase.auth.getUser();
  const user = getUserResult.data?.user ?? null;
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("paper_trade_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[delete] paper session error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/dashboard/paper-trading");
}

export async function deleteBacktestRun(
  runId: string
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const getUserResult = await supabase.auth.getUser();
  const user = getUserResult.data?.user ?? null;
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("backtest_runs")
    .delete()
    .eq("id", runId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[delete] backtest run error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/dashboard/results");
  revalidatePath("/dashboard/backtests");
}
