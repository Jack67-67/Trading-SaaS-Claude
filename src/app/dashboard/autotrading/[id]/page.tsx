import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Activity, Clock, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { AutotradingControlCenter } from "@/components/dashboard/autotrading-control-center";
import type { AutotradingMetrics } from "@/lib/autotrading-ai";

export const metadata: Metadata = { title: "Autotrading Controls" };

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatCell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold">{label}</p>
      <p className={cn("text-lg font-bold font-mono tabular-nums mt-0.5", valueClass ?? "text-text-primary")}>{value}</p>
    </div>
  );
}

export default async function AutotradingDetailPage({ params }: { params: { id: string } }) {
  type SessRow = Record<string, unknown>;
  let sess: SessRow | null = null;
  let dbError: string | null = null;

  try {
    const supabase = createClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) console.error("[autotrading/detail] auth error:", authErr.message);
    if (!user) redirect("/auth/login");

    const { data, error } = await supabase
      .from("paper_trade_sessions")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (error) {
      dbError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
    }
    sess = data as SessRow | null;
  } catch (e) {
    if (e != null && typeof e === "object" && "digest" in e) throw e;
    dbError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  if (dbError || !sess) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/dashboard/autotrading" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <ArrowLeft size={12} /> Autotrading
        </Link>
        <div className="rounded-2xl border border-loss/40 bg-loss/5 px-5 py-5 space-y-2">
          <p className="text-sm font-bold text-loss">Could not load session</p>
          <p className="text-xs font-mono text-text-secondary break-all">{dbError ?? "Session not found"}</p>
        </div>
      </div>
    );
  }

  // ── Parse session data ────────────────────────────────────────────────────
  const results      = (sess.last_results ?? null) as Record<string, unknown> | null;
  const metrics      = (results?.metrics as AutotradingMetrics) ?? null;
  const equityCurve  = (results?.equity_curve ?? []) as { timestamp: string; equity: number }[];
  const lastBarDate  = (results?.last_bar_date as string) ?? null;

  const sessName         = String(sess.name ?? "");
  const sessSymbol       = String(sess.symbol ?? "");
  const sessInterval     = String(sess.interval ?? "");
  const sessLastRefreshed = (sess.last_refreshed_at as string | null) ?? null;
  const initialCapital   = Number(sess.initial_capital) || 100_000;

  // Autotrading fields — safe defaults if migration not run yet
  const autotradingEnabled = Boolean(sess.autotrading_enabled ?? false);
  const maxCapitalPct      = Number(sess.max_capital_pct ?? 100);
  const maxWeeklyLossPct   = Number(sess.max_weekly_loss_pct ?? 10);
  const maxMonthlyLossPct  = Number(sess.max_monthly_loss_pct ?? 20);
  const pauseOnEvents      = Boolean(sess.pause_on_events ?? true);
  const sessStatus         = String(sess.status ?? "active");
  const pauseReason        = (sess.pause_reason as string | null) ?? null;
  const lastAction         = (sess.last_action as string | null) ?? null;
  const lastActionAt       = (sess.last_action_at as string | null) ?? null;

  // Compute weekly/monthly PnL for AI recommendations
  const currentEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : null;
  function findEquityAtOffset(targetMs: number): number | null {
    let best: { timestamp: string; equity: number } | null = null;
    for (const pt of equityCurve) {
      if (new Date(pt.timestamp).getTime() <= targetMs) best = pt;
      else break;
    }
    return best?.equity ?? null;
  }
  const now    = Date.now();
  const DAY_MS = 86_400_000;
  const eq7d   = currentEquity !== null ? findEquityAtOffset(now - 7 * DAY_MS) : null;
  const eq30d  = currentEquity !== null ? findEquityAtOffset(now - 30 * DAY_MS) : null;
  const weeklyLossPct  = eq7d  && eq7d  > 0 && currentEquity !== null ? ((currentEquity - eq7d)  / eq7d)  * 100 : null;
  const monthlyLossPct = eq30d && eq30d > 0 && currentEquity !== null ? ((currentEquity - eq30d) / eq30d) * 100 : null;

  const totalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const hasResults  = metrics !== null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard/autotrading"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          Autotrading
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Bot size={16} className="text-accent" />
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-accent/15 text-accent uppercase tracking-widest">
                Autotrading Controls
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{sessName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sessSymbol}</span>
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sessInterval}</span>
              {sessLastRefreshed && (
                <span className="flex items-center gap-1 text-2xs text-text-muted/50">
                  <Clock size={9} />
                  Last checked {timeAgoShort(sessLastRefreshed)}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/paper-trading/${params.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
          >
            <Activity size={12} />
            View full session
            <ExternalLink size={10} className="text-text-muted/50" />
          </Link>
        </div>
      </div>

      {/* ── Metrics snapshot (if available) ────────────────────────────────── */}
      {hasResults && (
        <div className="rounded-2xl border border-border bg-surface-1 px-5 py-5">
          <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-4">
            Performance snapshot{lastBarDate && ` · as of ${lastBarDate}`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            <StatCell
              label="Portfolio"
              value={`$${totalEquity.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            />
            <StatCell
              label="Total Return"
              value={formatPercent(metrics!.total_return_pct ?? 0)}
              valueClass={pnlColor(metrics!.total_return_pct ?? 0)}
            />
            <StatCell
              label="Sharpe"
              value={(metrics!.sharpe_ratio ?? 0).toFixed(2)}
              valueClass={(metrics!.sharpe_ratio ?? 0) >= 1 ? "text-profit" : (metrics!.sharpe_ratio ?? 0) < 0.5 ? "text-loss" : "text-text-primary"}
            />
            <StatCell
              label="Max Drawdown"
              value={`-${(metrics!.max_drawdown_pct ?? 0).toFixed(1)}%`}
              valueClass="text-loss"
            />
            <StatCell
              label="Win Rate"
              value={`${(metrics!.win_rate_pct ?? 0).toFixed(0)}%`}
            />
            <StatCell
              label="Trades"
              value={String(metrics!.total_trades ?? 0)}
            />
          </div>
          {/* Weekly / monthly P&L context */}
          {(weeklyLossPct !== null || monthlyLossPct !== null) && (
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/60">
              {weeklyLossPct !== null && (
                <div>
                  <p className="text-2xs text-text-muted">7-day P&L</p>
                  <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(weeklyLossPct))}>
                    {weeklyLossPct >= 0 ? "+" : ""}{weeklyLossPct.toFixed(1)}%
                  </p>
                </div>
              )}
              {monthlyLossPct !== null && (
                <div>
                  <p className="text-2xs text-text-muted">30-day P&L</p>
                  <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(monthlyLossPct))}>
                    {monthlyLossPct >= 0 ? "+" : ""}{monthlyLossPct.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── No data yet ────────────────────────────────────────────────────── */}
      {!hasResults && (
        <div className="rounded-2xl border border-border border-dashed bg-surface-1 px-8 py-8 text-center">
          <Activity size={24} className="mx-auto text-text-muted/30 mb-2" />
          <p className="text-sm text-text-muted">No simulation data yet — run a refresh from the paper trading session first.</p>
          <Link
            href={`/dashboard/paper-trading/${params.id}`}
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Go to paper trading session →
          </Link>
        </div>
      )}

      {/* ── Control center ─────────────────────────────────────────────────── */}
      <AutotradingControlCenter
        sessionId={params.id}
        status={sessStatus}
        autotradingEnabled={autotradingEnabled}
        pauseReason={pauseReason}
        lastAction={lastAction}
        lastActionAt={lastActionAt}
        maxCapitalPct={maxCapitalPct}
        maxWeeklyLossPct={maxWeeklyLossPct}
        maxMonthlyLossPct={maxMonthlyLossPct}
        pauseOnEvents={pauseOnEvents}
        metrics={metrics}
        weeklyLossPct={weeklyLossPct}
        monthlyLossPct={monthlyLossPct}
      />

    </div>
  );
}
