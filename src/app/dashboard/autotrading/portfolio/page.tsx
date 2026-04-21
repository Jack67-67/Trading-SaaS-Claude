import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BarChart2, TrendingUp, TrendingDown,
  Activity, AlertTriangle, CheckCircle2, Eye, Zap, FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { getOrCreatePortfolio } from "@/app/actions/portfolio";
import { getAllUserOrders } from "@/app/actions/orders";
import { getTodayGuard } from "@/lib/economic-calendar";
import {
  computePortfolioSnapshot,
  checkPortfolioLimits,
  portfolioCapacityUsed,
  type SessionRiskSnapshot,
  type PortfolioControls,
} from "@/lib/portfolio-risk";
import { PortfolioKillSwitch }  from "@/components/dashboard/portfolio-kill-switch";
import { PortfolioRiskEngine }  from "@/components/dashboard/portfolio-risk-engine";
import { ExecutionOrderLog }    from "@/components/dashboard/execution-order-log";
import type { TradingMode }     from "@/app/actions/live-trading";

export const metadata: Metadata = { title: "Portfolio Overview" };

function fmt$(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function findEquityAt(
  curve: { timestamp: string; equity: number }[],
  targetMs: number,
): number | null {
  let best: { timestamp: string; equity: number } | null = null;
  for (const pt of curve) {
    if (new Date(pt.timestamp).getTime() <= targetMs) best = pt;
    else break;
  }
  return best?.equity ?? null;
}

export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) redirect("/auth/login");

  // ── Fetch portfolio ──────────────────────────────────────────────────────
  let portfolio: Awaited<ReturnType<typeof getOrCreatePortfolio>> | null = null;
  let portfolioError: string | null = null;

  try {
    portfolio = await getOrCreatePortfolio();
    if ("error" in portfolio) {
      portfolioError = portfolio.error;
      portfolio = null;
    }
  } catch {
    portfolioError = "Portfolio features require the database migration. Run supabase/migrations/00008_portfolio_execution.sql to enable.";
  }

  // ── Fetch all sessions ───────────────────────────────────────────────────
  type SessRow = Record<string, unknown>;
  let sessions: SessRow[] = [];

  try {
    const { data } = await supabase
      .from("paper_trade_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    sessions = (data ?? []) as SessRow[];
  } catch { /* empty */ }

  // ── Fetch orders ─────────────────────────────────────────────────────────
  let orders: Awaited<ReturnType<typeof getAllUserOrders>> = [];
  try {
    const res = await getAllUserOrders(100);
    if (!("error" in res)) orders = res;
  } catch { /* pre-migration */ }

  // ── Economic calendar ────────────────────────────────────────────────────
  const guard = getTodayGuard();

  // ── Build session risk snapshots ─────────────────────────────────────────
  const DAY_MS = 86_400_000;
  const now    = Date.now();

  const sessionSnapshots: SessionRiskSnapshot[] = sessions.map(sess => {
    const results     = (sess.last_results ?? null) as Record<string, unknown> | null;
    const curve       = (results?.equity_curve ?? []) as { timestamp: string; equity: number }[];
    const initCap     = Number(sess.initial_capital) || 100_000;
    const maxCapPct   = Number(sess.max_capital_pct ?? 100);
    const allocatedCap = initCap * (maxCapPct / 100);
    const currentEquity = curve.length > 0 ? curve[curve.length - 1].equity : initCap;
    const pnl    = currentEquity - initCap;
    const pnlPct = initCap > 0 ? (pnl / initCap) * 100 : 0;
    const eq7d   = findEquityAt(curve, now - 7  * DAY_MS);
    const eq30d  = findEquityAt(curve, now - 30 * DAY_MS);
    const wLoss  = eq7d  && eq7d  > 0 ? ((currentEquity - eq7d)  / eq7d)  * 100 : null;
    const mLoss  = eq30d && eq30d > 0 ? ((currentEquity - eq30d) / eq30d) * 100 : null;
    const openPositions = (results?.open_positions ?? []) as unknown[];

    return {
      sessionId:      String(sess.id),
      name:           String(sess.name ?? ""),
      symbol:         String(sess.symbol ?? ""),
      interval:       String(sess.interval ?? ""),
      tradingMode:    String(sess.trading_mode ?? "paper"),
      status:         String(sess.status ?? "active"),
      allocatedCap,
      currentEquity,
      pnl,
      pnlPct,
      weeklyLossPct:  wLoss,
      monthlyLossPct: mLoss,
      openTradesCount: openPositions.length,
      autoEnabled:    Boolean(sess.autotrading_enabled ?? false),
    };
  });

  // ── Portfolio snapshot & violations ─────────────────────────────────────
  const snap = computePortfolioSnapshot(sessionSnapshots);

  const controls: PortfolioControls = portfolio && !("error" in portfolio) ? {
    maxPortfolioRiskPct:    Number((portfolio as any).max_portfolio_risk_pct   ?? 5),
    maxRiskPerStrategyPct:  Number((portfolio as any).max_risk_per_strategy_pct ?? 2),
    maxSimultaneousTrades:  Number((portfolio as any).max_simultaneous_trades   ?? 5),
    maxWeeklyLossPct:       Number((portfolio as any).max_weekly_loss_pct        ?? 10),
    maxMonthlyLossPct:      Number((portfolio as any).max_monthly_loss_pct       ?? 20),
    pauseOnEvents:          Boolean((portfolio as any).pause_on_events ?? true),
  } : {
    maxPortfolioRiskPct: 5, maxRiskPerStrategyPct: 2,
    maxSimultaneousTrades: 5, maxWeeklyLossPct: 10,
    maxMonthlyLossPct: 20, pauseOnEvents: true,
  };

  const violations = portfolio ? checkPortfolioLimits(snap, controls) : [];
  const capacity   = portfolio ? portfolioCapacityUsed(snap, controls) : 0;

  const portfolioRow = portfolio && !("error" in portfolio) ? portfolio as any : null;
  const portStatus   = portfolioRow?.status ?? "active";

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/autotrading"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowLeft size={12} /> Control Center
      </Link>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={cn(
        "rounded-2xl border overflow-hidden",
        portStatus === "stopped" ? "border-loss/25 bg-loss/[0.02]"
          : violations.some(v => v.severity === "critical") ? "border-loss/20 bg-surface-1"
          : violations.length > 0 ? "border-amber-500/20 bg-surface-1"
          : "border-border bg-surface-1",
      )}>
        {portStatus === "active" && violations.length === 0 && (
          <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        )}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                  portStatus === "stopped" ? "text-loss bg-loss/10 border-loss/25"
                    : portStatus === "paused"  ? "text-amber-400 bg-amber-400/10 border-amber-400/25"
                    : "text-profit bg-profit/10 border-profit/25",
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    portStatus === "active" ? "bg-profit animate-pulse" : "bg-current opacity-60",
                  )} />
                  {portStatus === "stopped" ? "Stopped" : portStatus === "paused" ? "Paused" : "Active"}
                </span>
                {guard?.level === "danger" && (
                  <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/25 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <AlertTriangle size={9} />
                    {guard.events[0]?.short} today
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Portfolio Overview</h1>
              <p className="text-xs text-text-muted mt-1">
                {snap.activeCount} active · {snap.pausedCount} paused · {snap.stoppedCount} stopped · {sessions.length} total strategies
              </p>
            </div>
            {portfolioRow && (
              <PortfolioKillSwitch
                portfolioId={portfolioRow.id}
                portfolioStatus={portStatus}
                sessionCount={sessions.filter(s => String(s.status) !== "stopped").length}
              />
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-5 pt-5 border-t border-border/60">
            <MetricCell label="Total Allocated" value={fmt$(snap.totalAllocated)} />
            <MetricCell label="Total Equity"    value={fmt$(snap.totalEquity)} />
            <MetricCell
              label="Total P&L"
              value={`${snap.totalPnl >= 0 ? "+" : ""}${fmt$(snap.totalPnl)}`}
              valueClass={pnlColor(snap.totalPnl)}
              sub={`${snap.totalPnlPct >= 0 ? "+" : ""}${snap.totalPnlPct.toFixed(2)}%`}
            />
            <MetricCell label="Open Trades" value={String(snap.openTradesTotal)} sub={`of ${controls.maxSimultaneousTrades} max`} />
          </div>

          {/* Capacity gauge */}
          {capacity > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xs text-text-muted">Portfolio capacity used</span>
                <span className={cn(
                  "text-2xs font-mono font-semibold",
                  capacity >= 90 ? "text-loss" : capacity >= 70 ? "text-amber-400" : "text-text-muted/60",
                )}>
                  {capacity.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    capacity >= 90 ? "bg-loss" : capacity >= 70 ? "bg-amber-400" : "bg-accent/50",
                  )}
                  style={{ width: `${capacity}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Migration notice ─────────────────────────────────────────────── */}
      {portfolioError && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 space-y-1">
          <p className="text-sm font-bold text-amber-400">Portfolio features unavailable</p>
          <p className="text-xs text-text-muted">{portfolioError}</p>
        </div>
      )}

      {/* ── Limit violations ─────────────────────────────────────────────── */}
      {violations.length > 0 && (
        <div className="space-y-2">
          {violations.map(v => (
            <div
              key={v.type}
              className={cn(
                "rounded-xl border px-4 py-3 flex items-start gap-3",
                v.severity === "critical"
                  ? "border-loss/30 bg-loss/[0.04]"
                  : "border-amber-400/25 bg-amber-400/[0.04]",
              )}
            >
              <AlertTriangle size={13} className={v.severity === "critical" ? "text-loss mt-0.5" : "text-amber-400 mt-0.5"} />
              <p className={cn("text-xs font-medium", v.severity === "critical" ? "text-loss" : "text-amber-400")}>
                {v.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Event guard ──────────────────────────────────────────────────── */}
      {guard && guard.level !== "upcoming" && (
        <div className={cn(
          "rounded-xl border px-4 py-3 flex items-start gap-3",
          guard.level === "danger"
            ? "border-amber-400/25 bg-amber-400/[0.04]"
            : "border-border bg-surface-1",
        )}>
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-300">
              {guard.events[0]?.short} — {guard.daysUntil === 0 ? "today" : guard.daysUntil === 1 ? "tomorrow" : `in ${guard.daysUntil} days`}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{guard.events[0]?.description}</p>
          </div>
        </div>
      )}

      {/* ── Main content: strategies + controls ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Strategies list (wider) */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">Strategies</h2>
          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-1 px-5 py-8 text-center">
              <p className="text-sm text-text-muted">No strategies yet</p>
              <p className="text-xs text-text-muted/60 mt-1">
                Create a session in <Link href="/dashboard/paper-trading/new" className="text-accent hover:underline">Paper Trading</Link> to get started.
              </p>
            </div>
          ) : (
            sessionSnapshots.map(sess => (
              <SessionCard key={sess.sessionId} sess={sess} />
            ))
          )}
        </div>

        {/* Controls (narrower) */}
        <div className="lg:col-span-2 space-y-4">
          {portfolioRow && (
            <PortfolioRiskEngine
              portfolioId={portfolioRow.id}
              maxPortfolioRiskPct={controls.maxPortfolioRiskPct}
              maxRiskPerStrategyPct={controls.maxRiskPerStrategyPct}
              maxSimultaneousTrades={controls.maxSimultaneousTrades}
              maxWeeklyLossPct={controls.maxWeeklyLossPct}
              maxMonthlyLossPct={controls.maxMonthlyLossPct}
              pauseOnEvents={controls.pauseOnEvents}
              openTradesTotal={snap.openTradesTotal}
              worstWeeklyLoss={snap.worstWeeklyLoss}
              worstMonthlyLoss={snap.worstMonthlyLoss}
            />
          )}
        </div>
      </div>

      {/* ── Order log ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Activity size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Signal & Order Log</p>
          {Array.isArray(orders) && orders.length > 0 && (
            <span className="ml-auto text-2xs text-text-muted">{orders.length} entries</span>
          )}
        </div>
        <div className="px-5 py-4">
          <ExecutionOrderLog orders={Array.isArray(orders) ? orders : []} showSessionColumn />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCell({ label, value, valueClass, sub }: {
  label: string; value: string; valueClass?: string; sub?: string;
}) {
  return (
    <div>
      <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold">{label}</p>
      <p className={cn("text-lg font-bold font-mono tabular-nums mt-0.5", valueClass ?? "text-text-primary")}>{value}</p>
      {sub && <p className="text-2xs text-text-muted/60 mt-0.5">{sub}</p>}
    </div>
  );
}

const MODE_BADGE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  paper:     { label: "Paper",     cls: "text-text-muted/60 bg-surface-3 border-border",           icon: FileText },
  shadow:    { label: "Shadow",    cls: "text-accent bg-accent/10 border-accent/25",                icon: Eye      },
  live_prep: { label: "Live Prep", cls: "text-amber-400 bg-amber-400/10 border-amber-400/25",       icon: Zap      },
  live:      { label: "LIVE",      cls: "text-profit bg-profit/10 border-profit/25",                icon: Zap      },
};

function SessionCard({ sess }: { sess: SessionRiskSnapshot }) {
  const isStopped = sess.status === "stopped";
  const isPaused  = sess.status === "paused";
  const mode = MODE_BADGE[sess.tradingMode] ?? MODE_BADGE.paper;
  const ModeIcon = mode.icon;

  return (
    <Link
      href={`/dashboard/autotrading/${sess.sessionId}`}
      className={cn(
        "flex items-center gap-4 rounded-2xl border px-5 py-4 hover:bg-surface-2 hover:border-border-hover transition-all group",
        isStopped ? "border-loss/15 bg-surface-1/50 opacity-60"
          : isPaused  ? "border-amber-500/15 bg-surface-1"
          : "border-border bg-surface-1",
      )}
    >
      {/* Status dot */}
      <span className={cn(
        "w-2 h-2 rounded-full shrink-0",
        isStopped ? "bg-loss/40"
          : isPaused  ? "bg-amber-400"
          : sess.autoEnabled ? "bg-profit animate-pulse"
          : "bg-text-muted/30",
      )} />

      {/* Name + symbol */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{sess.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.symbol}</span>
          <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.interval}</span>
        </div>
      </div>

      {/* Mode badge */}
      <span className={cn(
        "text-2xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1",
        mode.cls,
      )}>
        <ModeIcon size={9} />
        {mode.label}
      </span>

      {/* P&L */}
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-bold font-mono tabular-nums", pnlColor(sess.pnl))}>
          {sess.pnl >= 0 ? "+" : ""}{sess.pnlPct.toFixed(2)}%
        </p>
        <p className={cn("text-2xs font-mono", pnlColor(sess.pnl))}>
          {sess.pnl >= 0 ? "+" : ""}{sess.pnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
        </p>
      </div>
    </Link>
  );
}
