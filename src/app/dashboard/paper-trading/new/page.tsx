import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewPaperSessionForm } from "@/components/dashboard/new-paper-session-form";

export const metadata: Metadata = { title: "New Paper Trading Session" };

export default async function NewPaperSessionPage() {
  // ── Data fetch ───────────────────────────────────────────────────────────
  let strategyList: { id: string; name: string; config?: Record<string, unknown> | null }[] = [];
  let dbError: string | null = null;

  try {
    const supabase = createClient();

    const getUserResult = await supabase.auth.getUser();
    const authError = getUserResult.error;
    const user = getUserResult.data?.user ?? null;
    if (authError) console.error("[paper/new] auth error:", authError.message);
    if (!user) redirect("/auth/login");

    const { data, error } = await (supabase as any)
      .from("strategies")
      .select("id, name, config")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[paper/new] strategies error:", error.code, error.message);
      dbError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
    }
    strategyList = (data ?? []) as { id: string; name: string }[];
  } catch (e) {
    if (e != null && typeof e === "object" && "digest" in e) throw e;
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[paper/new] unexpected throw:", msg);
    dbError = msg;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl space-y-6 animate-fade-in">
      <div>
        <Link
          href="/dashboard/paper-trading"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          Back to Paper Trading
        </Link>
        <div className="flex items-center gap-2.5 mb-1">
          <Activity size={16} className="text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-widest">Paper / Virtual</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">New Session</h1>
        <p className="text-sm text-text-secondary mt-1">
          Choose a strategy and a start date. The simulation runs to today using real historical data — no real money is involved.
        </p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-loss/40 bg-loss/5 px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-loss uppercase tracking-wider">Could not load strategies</p>
          <p className="text-xs font-mono text-text-secondary break-all">{dbError}</p>
        </div>
      )}

      {!dbError && strategyList.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface-1 px-6 py-10 text-center">
          <p className="text-sm font-medium text-text-secondary mb-1">No strategies yet</p>
          <p className="text-xs text-text-muted mb-4">Create a strategy first, then come back to start a paper session.</p>
          <Link
            href="/dashboard/strategies"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Go to Strategies
          </Link>
        </div>
      )}

      {!dbError && strategyList.length > 0 && (
        <NewPaperSessionForm strategies={strategyList} />
      )}
    </div>
  );
}
