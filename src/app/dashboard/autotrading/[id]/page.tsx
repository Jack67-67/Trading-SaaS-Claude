import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bot, Activity, Clock, ExternalLink,
  AlertTriangle, TrendingUp, TrendingDown, Radio,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { AutotradingControlCenter } from "@/components/dashboard/autotrading-control-center";
import { getTodayGuard } from "@/lib/economic-calendar";
import { EventGuard } from "@/components/dashboard/event-guard";
import {
  generateAutotradingRecommendations,
  computeLiveState,
  type AutotradingMetrics,
} from "@/lib/autotrading-ai";

export const metadata: Metadata = { title: "Autotrading Controls" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function runningFor(startDate: string): string {
  const days = Math.floor((Date.now() - new Date(startDate + "T00:00:00Z").getTime()) / 86_400_000);
  if (days <= 0)  return "today";
  if (days === 1) return "1 day";
  if (days < 30)  return `${days} days`;
  const m = Math.floor(days / 30);
  return `${m} month${m !== 1 ? "s" : ""}`;
}

function findEquityAt(curve: { timestamp: string; equity: number }[], targetMs: number): number | null {
  let best: { timestamp: string; equity: number } | null = null;
  for (const pt of curve) {
    if (new Date(pt.timestamp).getTime() <= targetMs) best = pt;
    else break;
  }
  return best?.equity ?? null;
}

function MetricCell({
  label, value, valueClass, sub,
}: {
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

// ── Page ──────────────────────────────────────────────────────────────────────

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

    if (error) dbError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
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

  // ── Parse ─────────────────────────────────────────────────────────────────
  const results     = (sess.last_results ?? null) as Record<string, unknown> | null;
  const metrics     = (results?.metrics as AutotradingMetrics) ?? null;
  const equityCurve = (results?.equity_curve ?? []) as { timestamp: string; equity: number }[];
  const lastBarDate = (results?.last_bar_date as string) ?? null;

  const sessName     = String(sess.name ?? "");
  const sessSymbol   = String(sess.symbol ?? "");
  const sessInterval = String(sess.interval ?? "");
  const sessLastRef  = (sess.last_refreshed_at as string | null) ?? null;
  const sessStart    = String(sess.start_date ?? "");
  const initCap      = Number(sess.initial_capital) || 100_000;

  // Autotrading fields — safe defaults if migration not run yet
  const autoEnabled      = Boolean(sess.autotrading_enabled ?? false);
  const maxCapitalPct    = Number(sess.max_capital_pct ?? 100);
  const maxWeeklyLoss    = Number(sess.max_weekly_loss_pct ?? 10);
  const maxMonthlyLoss   = Number(sess.max_monthly_loss_pct ?? 20);
  const pauseOnEvents    = Boolean(sess.pause_on_events ?? true);
  const sessStatus       = String(sess.status ?? "active");
  const pauseReason      = (sess.pause_reason as string | null) ?? null;
  const lastAction       = (sess.last_action as string | null) ?? null;
  const lastActionAt     = (sess.last_action_at as string | null) ?? null;

  // Equity + PnL
  const currentEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initCap;
  const allocatedCap  = initCap * (maxCapitalPct / 100);
  const pnl           = currentEquity - initCap;
  const pnlPct        = initCap > 0 ? (pnl / initCap) * 100 : 0;

  // Weekly / monthly
  const DAY_MS   = 86_400_000;
  const now      = Date.now();
  const eq7d     = findEquityAt(equityCurve, now - 7  * DAY_MS);
  const eq30d    = findEquityAt(equityCurve, now - 30 * DAY_MS);
  const wLoss    = eq7d  && eq7d  > 0 ? ((currentEquity - eq7d)  / eq7d)  * 100 : null;
  const mLoss    = eq30d && eq30d > 0 ? ((currentEquity - eq30d) / eq30d) * 100 : null;

  const hasResults = metrics !== null;

  // Event guard
  const guard = getTodayGuard();
  const showGuard = guard && (guard.level === "danger" || guard.level === "caution");

  // AI recs
  const recs = metrics ? generateAutotradingRecommendations(metrics, {
    weeklyLossPct: wLoss,
    monthlyLossPct: mLoss,
    maxWeeklyLossPct: maxWeeklyLoss,
    maxMonthlyLossPct: maxMonthlyLoss,
  }) : [];
  const warnings = recs.filter(r => r.severity === "warning");

  // Status config
  const isStopped = sessStatus === "stopped";
  const isPaused  = sessStatus === "paused";
  const isRunning = autoEnabled && !isStopped && !isPaused;

  // Live state
  const live = computeLiveState({
    status:        sessStatus,
    autoEnabled,
    pauseReason,
    symbol:        sessSymbol,
    interval:      sessInterval,
    lastRefreshed: sessLastRef,
    metrics,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/autotrading"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowLeft size={12} />
        Control Center
      </Link>

      {/* ── Header card ────────────────────────────────────────────────────── */}
      <div className={cn(
        "rounded-2xl border overflow-hidden",
        isStopped ? "border-loss/25 bg-loss/[0.02]"
          : isPaused  ? "border-amber-500/20 bg-amber-500/[0.02]"
          : isRunning ? "border-profit/15 bg-profit/[0.02]"
          : "border-border bg-surface-1"
      )}>
        {isRunning && <div className="h-px bg-gradient-to-r from-transparent via-profit/40 to-transparent" />}

        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {/* Status badge + mode */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                  isStopped ? "text-loss bg-loss/10 border-loss/25"
                    : isPaused  ? "text-amber-400 bg-amber-400/10 border-amber-400/25"
                    : isRunning ? "text-profit bg-profit/10 border-profit/25"
                    : "text-text-muted bg-surface-3 border-border"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isRunning ? "bg-profit animate-pulse" : "bg-current opacity-60"
                  )} />
                  {isStopped ? "Stopped" : isPaused ? "Paused" : isRunning ? "Running" : "Off"}
                </span>
                <span className="text-2xs font-semibold text-text-muted/50 bg-surface-3 border border-border rounded-full px-2 py-0.5">
                  PAPER / VIRTUAL
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-text-primary">{sessName}</h1>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-2xs text-text-muted">
                <span className="font-mono bg-surface-3 px-1.5 py-0.5 rounded">{sessSymbol}</span>
                <span className="font-mono bg-surface-3 px-1.5 py-0.5 rounded">{sessInterval}</span>
                {sessStart && (
                  <span className="flex items-center gap-1">
                    <Clock size={9} />
                    Running {runningFor(sessStart)} · since {sessStart}
                  </span>
                )}
                {sessLastRef && (
                  <span className="flex items-center gap-1">
                    <Activity size={9} />
                    Last check {timeAgo(sessLastRef)}
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/dashboard/paper-trading/${params.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              <Activity size={12} />
              Full session
              <ExternalLink size={10} className="text-text-muted/50" />
            </Link>
          </div>

          {/* Capital + PnL summary */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-5 mt-5 pt-5 border-t border-border/60">
            <div>
              <p className="text-2xs text-text-muted mb-0.5">Allocated</p>
              <p className="text-base font-bold font-mono tabular-nums text-text-primary">{fmt$(allocatedCap)}</p>
              {maxCapitalPct < 100 && (
                <p className="text-2xs text-text-muted/60">{maxCapitalPct}% of {fmt$(initCap)}</p>
              )}
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-0.5">Current Equity</p>
              <p className="text-base font-bold font-mono tabular-nums text-text-primary">{fmt$(currentEquity)}</p>
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-0.5">P&L</p>
              <p className={cn("text-base font-bold font-mono tabular-nums", pnlColor(pnl))}>
                {pnl >= 0 ? "+" : ""}{fmt$(pnl)}
              </p>
              <p className={cn("text-2xs font-mono", pnlColor(pnlPct))}>
                {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </p>
            </div>
            {wLoss !== null && (
              <div>
                <p className="text-2xs text-text-muted mb-0.5">7-day P&L</p>
                <p className={cn("text-base font-bold font-mono tabular-nums", pnlColor(wLoss))}>
                  {wLoss >= 0 ? "+" : ""}{wLoss.toFixed(1)}%
                </p>
                {mLoss !== null && (
                  <p className={cn("text-2xs font-mono", pnlColor(mLoss))}>
                    30d: {mLoss >= 0 ? "+" : ""}{mLoss.toFixed(1)}%
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Live status ────────────────────────────────────────────────────── */}
      {(() => {
        const dotColor: Record<string, string> = {
          scanning: "bg-profit animate-pulse",
          active:   "bg-profit",
          waiting:  "bg-text-muted/40",
          paused:   "bg-amber-400",
          stopped:  "bg-loss",
          off:      "bg-text-muted/25",
        };
        return (
          <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
              <Radio size={12} className={cn(
                isRunning ? "text-profit" : "text-text-muted"
              )} />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Live Status</p>
              {isRunning && (
                <span className="ml-auto flex items-center gap-1.5 text-2xs font-semibold text-profit">
                  <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
                  Monitoring
                </span>
              )}
            </div>

            {/* 3-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">

              {/* Current state */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">Current State</p>
                <div className="flex items-start gap-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1", dotColor[live.level])} />
                  <p className="text-sm font-semibold text-text-primary leading-snug">{live.currentState}</p>
                </div>
                {sessLastRef && isRunning && (
                  <p className="text-2xs text-text-muted mt-2 flex items-center gap-1">
                    <Activity size={9} />
                    Last scan {(() => {
                      const diff = Date.now() - new Date(sessLastRef).getTime();
                      const mins = Math.floor(diff / 60_000);
                      if (mins < 1) return "just now";
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.floor(mins / 60);
                      return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
                    })()}
                  </p>
                )}
              </div>

              {/* What it's looking for */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">What it&apos;s looking for</p>
                <p className="text-sm text-text-secondary leading-relaxed">{live.watchingDetail}</p>
              </div>

              {/* Next action */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">Next Action</p>
                <p className="text-sm text-text-secondary leading-relaxed">{live.nextAction}</p>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Event guard ────────────────────────────────────────────────────── */}
      {showGuard && guard && (
        <EventGuard guard={guard} variant="full" />
      )}

      {/* ── Active AI warnings ─────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 overflow-hidden">
          <div className="px-5 py-3 bg-surface-1 border-b border-amber-500/15 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-400" />
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Active Warnings
            </p>
          </div>
          <div className="divide-y divide-border/60 bg-surface-0">
            {warnings.map(w => (
              <div key={w.id} className="flex items-start gap-3 px-5 py-3.5">
                <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">{w.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{w.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Performance detail (if results exist) ─────────────────────────── */}
      {hasResults && (
        <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Performance
            </p>
            {lastBarDate && (
              <span className="text-2xs text-text-muted/60 font-mono">as of {lastBarDate}</span>
            )}
          </div>
          <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            <MetricCell
              label="Total Return"
              value={formatPercent(metrics!.total_return_pct ?? 0)}
              valueClass={pnlColor(metrics!.total_return_pct ?? 0)}
            />
            <MetricCell
              label="Sharpe"
              value={(metrics!.sharpe_ratio ?? 0).toFixed(2)}
              valueClass={(metrics!.sharpe_ratio ?? 0) >= 1 ? "text-profit" : (metrics!.sharpe_ratio ?? 0) < 0.5 ? "text-loss" : "text-text-primary"}
            />
            <MetricCell
              label="Max Drawdown"
              value={`-${(metrics!.max_drawdown_pct ?? 0).toFixed(1)}%`}
              valueClass="text-loss"
            />
            <MetricCell
              label="Win Rate"
              value={`${(metrics!.win_rate_pct ?? 0).toFixed(0)}%`}
            />
            <MetricCell
              label="Trades"
              value={String(metrics!.total_trades ?? 0)}
              sub={`PF ${(metrics!.profit_factor ?? 0).toFixed(2)}`}
            />
          </div>
        </div>
      )}

      {/* ── No data ────────────────────────────────────────────────────────── */}
      {!hasResults && (
        <div className="rounded-2xl border border-border border-dashed bg-surface-1 px-8 py-8 text-center">
          <Activity size={22} className="mx-auto text-text-muted/30 mb-2" />
          <p className="text-sm text-text-muted">No simulation data yet.</p>
          <Link
            href={`/dashboard/paper-trading/${params.id}`}
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Run a refresh in the paper trading session →
          </Link>
        </div>
      )}

      {/* ── Control center ─────────────────────────────────────────────────── */}
      <AutotradingControlCenter
        sessionId={params.id}
        status={sessStatus}
        autotradingEnabled={autoEnabled}
        pauseReason={pauseReason}
        lastAction={lastAction}
        lastActionAt={lastActionAt}
        maxCapitalPct={maxCapitalPct}
        maxWeeklyLossPct={maxWeeklyLoss}
        maxMonthlyLossPct={maxMonthlyLoss}
        pauseOnEvents={pauseOnEvents}
        metrics={metrics}
        weeklyLossPct={wLoss}
        monthlyLossPct={mLoss}
      />

    </div>
  );
}
