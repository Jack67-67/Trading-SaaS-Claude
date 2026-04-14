import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, TrendingUp, TrendingDown, Minus, Activity, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { timeAgo } from "@/components/dashboard/daily-update";

export const metadata: Metadata = { title: "Paper Trading" };

function DbErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-loss/40 bg-loss/5 px-4 py-3 space-y-1">
      <p className="text-xs font-bold text-loss uppercase tracking-wider">Error — paper_trade_sessions</p>
      <p className="text-xs font-mono text-text-secondary break-all">{message}</p>
      <p className="text-2xs text-text-muted pt-1">
        Ensure migration <code className="bg-surface-3 px-1 rounded">00003_paper_trading.sql</code> was applied in Supabase → SQL Editor.
      </p>
    </div>
  );
}

export default async function PaperTradingPage() {
  // Everything inside one try/catch — createClient, getUser, and the query
  // can all throw in production; we need to catch them and render the error
  // in the page instead of crashing to the error boundary.
  let renderError: string | null = null;

  type SessionRow = {
    id: string; name: string; symbol: string; interval: string;
    status: string; last_results: unknown; last_refreshed_at: string | null;
    created_at: string; start_date: string; initial_capital: unknown;
    strategy_id: string;
  };
  let sessions: SessionRow[] = [];

  try {
    const supabase = createClient();

    const getUserResult = await supabase.auth.getUser();
    const authError = getUserResult.error;
    const user = getUserResult.data?.user ?? null;

    if (authError) {
      console.error("[paper/list] getUser error:", authError.message);
    }

    if (!user) {
      redirect("/auth/login");
    }

    const { data, error } = await supabase
      .from("paper_trade_sessions")
      .select("id, name, symbol, interval, status, last_results, last_refreshed_at, created_at, start_date, initial_capital, strategy_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[paper/list] query error:", error.code, error.message, error.details, error.hint);
      renderError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
    } else {
      sessions = (data ?? []) as SessionRow[];
    }
  } catch (e) {
    // Re-throw Next.js navigation errors (redirect / notFound digest)
    if (e != null && typeof e === "object" && "digest" in e) throw e;
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[paper/list] unexpected throw:", msg);
    renderError = msg;
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Activity size={18} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Paper / Virtual</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Paper Trading</h1>
          <p className="text-sm text-text-secondary mt-1">
            Simulate live trading with no real money. Run strategies forward from any start date to today.
          </p>
        </div>
        <Link
          href="/dashboard/paper-trading/new"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} />
          New Session
        </Link>
      </div>

      {renderError && <DbErrorBanner message={renderError} />}

      {!renderError && sessions.length === 0 && (
        <div className="rounded-2xl border border-border border-dashed bg-surface-1 px-8 py-14 text-center">
          <Activity size={32} className="mx-auto text-text-muted/30 mb-4" />
          <p className="text-sm font-semibold text-text-secondary mb-1">No paper trading sessions yet</p>
          <p className="text-xs text-text-muted mb-5 max-w-xs mx-auto">
            Create a session to simulate how a strategy would perform running from a past date to today.
          </p>
          <Link
            href="/dashboard/paper-trading/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            <Plus size={13} />
            Create First Session
          </Link>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const results = sess.last_results as Record<string, unknown> | null;
            const metrics = results?.metrics as { total_return_pct?: number } | undefined;
            const returnPct: number | null = metrics?.total_return_pct ?? null;
            const openPositions: unknown[] = (results?.open_positions as unknown[]) ?? [];
            const hasPosition = openPositions.length > 0;

            return (
              <Link
                key={sess.id}
                href={`/dashboard/paper-trading/${sess.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-1 px-5 py-4 hover:bg-surface-2 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 leading-none uppercase tracking-wider">
                      PAPER
                    </span>
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                      {sess.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.symbol}</span>
                    <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.interval}</span>
                    {hasPosition && <span className="text-2xs font-semibold text-profit">● In position</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {returnPct !== null ? (
                    <>
                      <p className="text-2xs text-text-muted">Total return</p>
                      <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(returnPct))}>
                        {formatPercent(returnPct)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted/40">Pending</p>
                  )}
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-2xs text-text-muted">Last checked</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <RefreshCw size={9} className="text-text-muted/40" />
                    <p className="text-2xs text-text-muted/60">
                      {sess.last_refreshed_at ? timeAgo(sess.last_refreshed_at) : "Never"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {returnPct === null ? (
                    <Minus size={14} className="text-text-muted/30" />
                  ) : returnPct > 0.5 ? (
                    <TrendingUp size={14} className="text-profit" />
                  ) : returnPct < -0.5 ? (
                    <TrendingDown size={14} className="text-loss" />
                  ) : (
                    <Minus size={14} className="text-text-muted/30" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
