import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Activity, TrendingUp, TrendingDown,
  Minus, Clock, BarChart3, AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { timeAgo } from "@/components/dashboard/daily-update";
import { RefreshPaperSessionButton } from "@/components/dashboard/refresh-paper-session-button";

export const metadata: Metadata = { title: "Paper Session" };

interface OpenPosition {
  symbol: string; shares: number; entry_price: number;
  current_price: number; unrealized_pnl: number;
  unrealized_pct: number; market_value: number;
}
interface ClosedTrade {
  timestamp: string; symbol: string; entry_price: number;
  exit_price: number; shares: number; pnl: number; return_pct: number;
}
interface Metrics {
  total_return_pct: number; annualized_return_pct: number;
  sharpe_ratio: number; max_drawdown_pct: number;
  win_rate_pct: number; total_trades: number;
  profit_factor: number; volatility_pct: number;
}

function StatCell({ label, value, sub, valueClass }: {
  label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div>
      <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold">{label}</p>
      <p className={cn("text-lg font-bold font-mono tabular-nums mt-0.5", valueClass ?? "text-text-primary")}>{value}</p>
      {sub && <p className="text-2xs text-text-muted/60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function PaperSessionDetailPage({ params }: { params: { id: string } }) {
  type SessRow = Record<string, unknown>;
  let sess: SessRow | null = null;
  let dbError: string | null = null;

  try {
    // createClient() and getUser() must be inside the try/catch — both can throw
    // in production; any uncaught throw propagates to the error boundary.
    const supabase = createClient();

    const getUserResult = await supabase.auth.getUser();
    const authError = getUserResult.error;
    const user = getUserResult.data?.user ?? null;
    if (authError) console.error("[paper/detail] auth error:", authError.message);
    if (!user) redirect("/auth/login");

    const { data, error } = await supabase
      .from("paper_trade_sessions")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (error) {
      console.error("[paper/detail] query error:", error.code, error.message, error.details);
      // PGRST116 = "no rows returned" (notFound), everything else is a real error
      if (error.code === "PGRST116") {
        notFound();
      }
      dbError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
    }
    sess = data as SessRow | null;
  } catch (e) {
    // Re-throw Next.js navigation errors (redirect / notFound)
    if (e != null && typeof e === "object" && "digest" in e) throw e;
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[paper/detail] unexpected throw:", msg);
    dbError = msg;
  }

  // ── Show error in UI instead of crashing ──────────────────────────────────
  if (dbError) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/dashboard/paper-trading" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <ArrowLeft size={12} /> All Sessions
        </Link>
        <div className="rounded-2xl border border-loss/40 bg-loss/5 px-5 py-5 space-y-2">
          <p className="text-sm font-bold text-loss">Could not load paper trading session</p>
          <p className="text-xs font-mono text-text-secondary break-all">{dbError}</p>
          <p className="text-2xs text-text-muted pt-1">
            This may mean the <code className="bg-surface-3 px-1 rounded">paper_trade_sessions</code> table does not exist yet.
            Run migration <code className="bg-surface-3 px-1 rounded">00003_paper_trading.sql</code> in Supabase → SQL Editor.
          </p>
        </div>
      </div>
    );
  }

  // Do NOT call notFound() here — in Next.js 14.2, notFound() thrown outside
  // a try/catch in a server component can be misrouted to error.tsx instead of
  // the 404 page. Render an inline message instead.
  if (!sess) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link href="/dashboard/paper-trading" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <ArrowLeft size={12} /> All Sessions
        </Link>
        <div className="rounded-2xl border border-border bg-surface-1 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-text-secondary">Session not found</p>
          <p className="text-xs text-text-muted mt-1">This session may have been deleted or does not belong to your account.</p>
        </div>
      </div>
    );
  }

  // ── Parse data ────────────────────────────────────────────────────────────
  const results = (sess.last_results ?? null) as Record<string, unknown> | null;
  const metrics: Metrics | null = (results?.metrics as Metrics) ?? null;
  const openPositions: OpenPosition[] = (results?.open_positions as OpenPosition[]) ?? [];
  const closedTrades: ClosedTrade[] = (results?.trades as ClosedTrade[]) ?? [];
  const equityCurve: { timestamp: string; equity: number }[] =
    (results?.equity_curve as { timestamp: string; equity: number }[]) ?? [];
  const lastBarDate: string | null = (results?.last_bar_date as string) ?? null;

  const hasResults = metrics !== null;
  const initialCapital = Number(sess.initial_capital) || 100_000;
  const totalEquity = equityCurve.length > 0
    ? equityCurve[equityCurve.length - 1].equity
    : initialCapital;

  const sessName = String(sess.name ?? "");
  const sessSymbol = String(sess.symbol ?? "");
  const sessInterval = String(sess.interval ?? "");
  const sessLastRefreshed = sess.last_refreshed_at as string | null;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard/paper-trading"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          All Sessions
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Activity size={16} className="text-accent" />
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-400/15 text-yellow-400 uppercase tracking-widest">
                PAPER / Virtual
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{sessName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sessSymbol}</span>
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sessInterval}</span>
              {sessLastRefreshed && (
                <span className="flex items-center gap-1 text-2xs text-text-muted/50">
                  <Clock size={9} />
                  Last checked {timeAgo(sessLastRefreshed)}
                </span>
              )}
            </div>
          </div>
          <RefreshPaperSessionButton sessionId={params.id} />
        </div>
      </div>

      {/* ── No results yet ───────────────────────────────────────────────── */}
      {!hasResults && (
        <div className="rounded-2xl border border-border border-dashed bg-surface-1 px-8 py-12 text-center">
          <Activity size={28} className="mx-auto text-text-muted/30 mb-3" />
          <p className="text-sm font-medium text-text-secondary mb-1">Simulation not run yet</p>
          <p className="text-xs text-text-muted">Click &ldquo;Check Now&rdquo; to run the simulation.</p>
        </div>
      )}

      {hasResults && (
        <>
          {/* ── Current Position ─────────────────────────────────────────── */}
          <div className={cn(
            "rounded-2xl border overflow-hidden",
            openPositions.length > 0 ? "border-profit/30 bg-profit/[0.02]" : "border-border bg-surface-1"
          )}>
            <div className="px-5 py-3.5 border-b border-inherit flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Current Position</p>
              {lastBarDate && <span className="text-2xs text-text-muted/60">as of {lastBarDate}</span>}
            </div>
            {openPositions.length === 0 ? (
              <div className="px-5 py-5 flex items-center gap-3">
                <Minus size={14} className="text-text-muted/40" />
                <p className="text-sm text-text-muted">No open position — strategy is flat.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {openPositions.map((pos) => (
                  <div key={pos.symbol} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{pos.symbol}</p>
                      <p className="text-2xs text-text-muted mt-0.5">
                        {(pos.shares ?? 0).toFixed(4)} shares · entry ${(pos.entry_price ?? 0).toFixed(2)} → now ${(pos.current_price ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xs text-text-muted">Market value</p>
                      <p className="text-sm font-mono font-bold text-text-primary tabular-nums">
                        ${pos.market_value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xs text-text-muted">Unrealized P&amp;L</p>
                      <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(pos.unrealized_pnl ?? 0))}>
                        {(pos.unrealized_pnl ?? 0) >= 0 ? "+" : ""}${Math.abs(pos.unrealized_pnl ?? 0).toFixed(2)}
                        <span className="text-xs ml-1">({formatPercent(pos.unrealized_pct ?? 0)})</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Summary metrics ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-surface-1 px-5 py-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              <StatCell
                label="Portfolio Value"
                value={`$${totalEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                sub={`Started $${initialCapital.toLocaleString()}`}
              />
              <StatCell label="Total Return" value={formatPercent(metrics!.total_return_pct ?? 0)} valueClass={pnlColor(metrics!.total_return_pct ?? 0)} />
              <StatCell
                label="Sharpe"
                value={(metrics!.sharpe_ratio ?? 0).toFixed(2)}
                valueClass={(metrics!.sharpe_ratio ?? 0) >= 1 ? "text-profit" : (metrics!.sharpe_ratio ?? 0) < 0.5 ? "text-loss" : "text-text-primary"}
              />
              <StatCell label="Max Drawdown" value={`-${(metrics!.max_drawdown_pct ?? 0).toFixed(1)}%`} valueClass="text-loss" />
              <StatCell label="Win Rate" value={`${(metrics!.win_rate_pct ?? 0).toFixed(0)}%`} />
              <StatCell label="Trades" value={String(metrics!.total_trades ?? 0)} sub={`PF ${(metrics!.profit_factor ?? 0).toFixed(2)}`} />
            </div>
          </div>

          {/* ── Trade log ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-3.5 bg-surface-1 border-b border-border flex items-center gap-2">
              <BarChart3 size={14} className="text-text-muted" />
              <p className="text-sm font-semibold text-text-primary">Trade Log</p>
              <span className="text-2xs text-text-muted/60 ml-auto">
                {closedTrades.length} closed {closedTrades.length === 1 ? "trade" : "trades"}
              </span>
            </div>
            {closedTrades.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-text-muted">No closed trades yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border bg-surface-0">
                <div className="grid grid-cols-5 gap-3 px-5 py-2.5 text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  <span className="col-span-2">Date / Symbol</span>
                  <span className="text-right hidden sm:block">Entry</span>
                  <span className="text-right hidden sm:block">Exit</span>
                  <span className="text-right">P&amp;L</span>
                </div>
                {[...closedTrades].reverse().map((trade, i) => (
                  <div key={i} className="grid grid-cols-5 gap-3 px-5 py-3 items-center">
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs font-mono text-text-secondary">{trade.symbol}</p>
                      <p className="text-2xs text-text-muted/60">
                        {new Date(trade.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </p>
                    </div>
                    <p className="text-xs font-mono text-text-muted text-right hidden sm:block tabular-nums">
                      ${(trade.entry_price ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs font-mono text-text-muted text-right hidden sm:block tabular-nums">
                      ${(trade.exit_price ?? 0).toFixed(2)}
                    </p>
                    <div className="text-right">
                      <p className={cn("text-xs font-mono font-bold tabular-nums", pnlColor(trade.pnl ?? 0))}>
                        {(trade.pnl ?? 0) >= 0 ? "+" : ""}${Math.abs(trade.pnl ?? 0).toFixed(2)}
                      </p>
                      <p className={cn("text-2xs font-mono tabular-nums", pnlColor(trade.return_pct ?? 0))}>
                        {formatPercent(trade.return_pct ?? 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Disclaimer ───────────────────────────────────────────────── */}
          <div className="flex items-start gap-2.5 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.02] px-4 py-3.5">
            <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">
              <strong className="text-yellow-400">Paper trading only.</strong>{" "}
              This simulation uses historical data replayed to today. It does not involve real money, real orders, or live market feeds.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
