import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bot, Activity, Clock, ExternalLink,
  AlertTriangle, Radio, History, ArrowRight,
  Eye, Info, CheckCircle2, Zap, ShieldCheck, XCircle,
  Lock, FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { AutotradingControlCenter } from "@/components/dashboard/autotrading-control-center";
import { getTodayGuard } from "@/lib/economic-calendar";
import { EventGuard } from "@/components/dashboard/event-guard";
import {
  generateAutotradingRecommendations,
  generateEventRecommendations,
  computeLiveState,
  computeShadowSignal,
  inferTradeCloseReason,
  estimateNextScan,
  computePerformanceTrend,
  computeEquityVolatility,
  type AutotradingMetrics,
  type MarketStateLevel,
  type SignalProgress,
  type NextActionTimingLevel,
  type ShadowSignal,
  type PerformanceTrend,
  type EquityVolatility,
} from "@/lib/autotrading-ai";
import {
  computeExecutionReadiness,
  type ReadinessSummary,
} from "@/lib/execution-readiness";
import { TradingModeSelector } from "@/components/dashboard/trading-mode-selector";
import { LiveSafetyChecklist } from "@/components/dashboard/live-safety-checklist";
import { ExecutionOrderLog } from "@/components/dashboard/execution-order-log";
import type { TradingMode } from "@/app/actions/live-trading";
import type { ExecutionOrder } from "@/lib/execution-engine";

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

  // ── Trade types (actual backend fields) ──────────────────────────────────
  type RawTrade = {
    timestamp: string;   // exit time
    symbol: string;
    entry_price: number;
    exit_price: number;
    shares: number;
    pnl: number;
    return_pct: number;
  };
  type RawOpenPosition = {
    symbol: string;
    shares: number;
    entry_price: number;
    current_price: number;
    unrealized_pnl: number;
    unrealized_pct: number;
    market_value: number;
  };

  // ── Parse ─────────────────────────────────────────────────────────────────
  const results     = (sess.last_results ?? null) as Record<string, unknown> | null;
  const metrics     = (results?.metrics as AutotradingMetrics) ?? null;
  const equityCurve = (results?.equity_curve ?? []) as { timestamp: string; equity: number }[];
  const lastBarDate = (results?.last_bar_date as string) ?? null;

  // Trades — last 20, newest first
  const allTrades      = (results?.trades ?? []) as RawTrade[];
  const recentTrades   = allTrades.slice(-20).reverse();
  const openPositions  = (results?.open_positions ?? []) as RawOpenPosition[];

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

  // AI recs — metric-based + event-based merged
  const metricRecs = metrics ? generateAutotradingRecommendations(metrics, {
    weeklyLossPct: wLoss,
    monthlyLossPct: mLoss,
    maxWeeklyLossPct: maxWeeklyLoss,
    maxMonthlyLossPct: maxMonthlyLoss,
  }) : [];
  const eventRecs = generateEventRecommendations(guard, pauseOnEvents);
  // Event warnings come first (more urgent)
  const recs = [...eventRecs, ...metricRecs];
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

  // Shadow mode — last known price from open positions or most recent closed trade
  const lastPrice: number | null =
    openPositions.length > 0  ? openPositions[0].current_price
    : recentTrades.length > 0 ? recentTrades[0].exit_price
    : null;

  const shadowSignal: ShadowSignal | null =
    autoEnabled && live.signalProgress === "ready" && metrics && lastPrice !== null
      ? computeShadowSignal({
          symbol:         sessSymbol,
          interval:       sessInterval,
          metrics,
          initialCapital: initCap,
          maxCapitalPct,
          lastPrice,
        })
      : null;

  const nextScan = autoEnabled ? estimateNextScan(sessInterval, sessLastRef) : null;

  // Performance trend
  const trend: PerformanceTrend | null = allTrades.length >= 3
    ? computePerformanceTrend(allTrades.map(t => ({ pnl: t.pnl, returnPct: t.return_pct })))
    : null;

  // Equity volatility
  const equityVol: EquityVolatility = computeEquityVolatility(equityCurve);

  // Daily trade count
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyTradesCount = allTrades.filter(t => t.timestamp?.startsWith(todayStr)).length;

  const maxDailyTrades = Number(sess.max_daily_trades ?? 10);

  // ── Stage 3: Trading mode + broker + readiness ────────────────────────────
  // trading_mode defaults to 'shadow' for existing sessions with autotrading on
  const rawMode = (sess.trading_mode as string | null) ?? null;
  const tradingMode: TradingMode =
    rawMode === "live"      ? "live"
    : rawMode === "live_prep" ? "live_prep"
    : rawMode === "shadow"  ? "shadow"
    : rawMode === "paper"   ? "paper"
    : autoEnabled           ? "shadow"   // legacy: autotrading_enabled=true → shadow
    : "paper";

  const brokerConnectionId = (sess.broker_connection_id as string | null) ?? null;

  // Fetch linked broker connection (display data only — no credentials)
  type BrokerRow = {
    id: string;
    status: string;
    display_name: string | null;
    account_number: string | null;
    cached_account_status: string | null;
    cached_buying_power: number | null;
    cached_equity: number | null;
    last_verified_at: string | null;
  };
  type BrokerListRow = { id: string; display_name: string | null; broker: string; status: string };

  let linkedBroker: BrokerRow | null = null;
  let userBrokers: BrokerListRow[] = [];

  try {
    const supabaseInner = (await import("@/lib/supabase/server")).createClient();
    const { data: { user: u } } = await supabaseInner.auth.getUser();
    if (u) {
      const db = supabaseInner as any;
      if (brokerConnectionId) {
        const { data } = await db
          .from("broker_connections")
          .select("id, status, display_name, account_number, cached_account_status, cached_buying_power, cached_equity, last_verified_at")
          .eq("id", brokerConnectionId)
          .eq("user_id", u.id)
          .single() as { data: BrokerRow | null };
        linkedBroker = data;
      }
      const { data: bList } = await db
        .from("broker_connections")
        .select("id, display_name, broker, status")
        .eq("user_id", u.id) as { data: BrokerListRow[] | null };
      userBrokers = bList ?? [];
    }
  } catch { /* pre-migration: broker_connections table may not exist */ }

  const brokerConnected = linkedBroker?.status === "connected";
  const dataFreshMins   = sessLastRef
    ? (Date.now() - new Date(sessLastRef).getTime()) / 60_000
    : null;

  const estimatedOrderCost = shadowSignal
    ? shadowSignal.entryApprox * shadowSignal.positionSize
    : 0;

  const readiness: ReadinessSummary = computeExecutionReadiness({
    brokerConnected,
    brokerStatus:         linkedBroker?.status ?? null,
    accountStatus:        linkedBroker?.cached_account_status ?? null,
    buyingPower:          linkedBroker?.cached_buying_power ?? null,
    estimatedOrderCost,
    hasMetrics:           hasResults,
    profitFactor:         metrics?.profit_factor ?? null,
    sharpeRatio:          metrics?.sharpe_ratio  ?? null,
    totalTrades:          metrics?.total_trades  ?? null,
    weeklyLossPct:        wLoss,
    maxWeeklyLossPct:     maxWeeklyLoss,
    monthlyLossPct:       mLoss,
    maxMonthlyLossPct:    maxMonthlyLoss,
    sessionStopped:       isStopped,
    sessionPaused:        isPaused,
    interval:             sessInterval,
    eventDanger:          guard?.level === "danger",
    eventName:            guard?.events?.[0]?.short ?? null,
    dataFreshMins,
  });

  // ── Execution orders ──────────────────────────────────────────────────────
  let executionOrders: ExecutionOrder[] = [];
  try {
    const { getSessionOrders } = await import("@/app/actions/orders");
    const ordersResult = await getSessionOrders(params.id, 50);
    if (!("error" in ordersResult)) executionOrders = ordersResult;
  } catch { /* pre-migration: execution_orders table may not exist */ }

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
                {tradingMode === "live" ? (
                  <span className="text-2xs font-semibold text-profit bg-profit/10 border border-profit/30 rounded-full px-2 py-0.5 flex items-center gap-1 animate-pulse">
                    <Radio size={9} />
                    LIVE TRADING
                  </span>
                ) : tradingMode === "live_prep" ? (
                  <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Zap size={9} />
                    LIVE PREP
                  </span>
                ) : tradingMode === "shadow" ? (
                  <span className="text-2xs font-semibold text-accent bg-accent/10 border border-accent/25 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Eye size={9} />
                    SHADOW MODE
                  </span>
                ) : (
                  <span className="text-2xs font-semibold text-text-muted/50 bg-surface-3 border border-border rounded-full px-2 py-0.5 flex items-center gap-1">
                    <FileText size={9} />
                    PAPER
                  </span>
                )}
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

      {/* ── Mode selector ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Zap size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Trading Mode</p>
          {tradingMode === "live_prep" && linkedBroker && (
            <span className="ml-auto text-2xs text-text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gain" />
              {linkedBroker.display_name}
              {linkedBroker.cached_buying_power !== null && (
                <span className="font-mono ml-1">${linkedBroker.cached_buying_power.toLocaleString()} BP</span>
              )}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          <TradingModeSelector
            sessionId={params.id}
            currentMode={tradingMode}
            brokerConnected={userBrokers.some(b => b.status === "connected")}
            sessionStopped={isStopped}
            allReadinessPassed={readiness.allBlockersPassed}
          />
        </div>
      </div>

      {/* ── Live safety checklist (shadow + live_prep + live) ──────────────── */}
      {(tradingMode === "shadow" || tradingMode === "live_prep" || tradingMode === "live") && (
        <LiveSafetyChecklist
          brokerConnected={brokerConnected}
          brokerStatus={linkedBroker?.status ?? null}
          accountActive={linkedBroker?.cached_account_status === "ACTIVE"}
          hasBuyingPower={
            linkedBroker?.cached_buying_power !== null &&
            linkedBroker?.cached_buying_power !== undefined &&
            linkedBroker.cached_buying_power >= estimatedOrderCost
          }
          buyingPower={linkedBroker?.cached_buying_power ?? null}
          estimatedOrderCost={estimatedOrderCost}
          weeklyLossOk={wLoss === null || wLoss > -maxWeeklyLoss}
          monthlyLossOk={mLoss === null || mLoss > -maxMonthlyLoss}
          eventDanger={guard?.level === "danger"}
          eventName={guard?.events?.[0]?.short ?? null}
          sessionStopped={isStopped}
          sessionPaused={isPaused}
          hasStrategy={hasResults}
          liveDisabled={tradingMode !== "live"}
        />
      )}

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
        const mktBadge = (level: MarketStateLevel, label: string) => (
          <span className={cn(
            "inline-block text-2xs font-semibold px-2 py-0.5 rounded-full border",
            level === "trending" && "text-profit    bg-profit/10    border-profit/20",
            level === "sideways" && "text-accent     bg-accent/10    border-accent/20",
            level === "volatile" && "text-amber-400  bg-amber-400/10 border-amber-400/20",
            level === "mixed"    && "text-text-muted bg-surface-3    border-border",
            level === "unknown"  && "text-text-muted/50 bg-surface-3/50 border-border/40",
          )}>{label}</span>
        );
        const sigBarColor = (p: SignalProgress) =>
          p === "ready" ? "bg-profit" : p === "partial" ? "bg-amber-400" : p === "blocked" ? "bg-loss" : "bg-accent";
        const sigTextColor = (p: SignalProgress) =>
          p === "ready" ? "text-profit" : p === "partial" ? "text-amber-400" : p === "blocked" ? "text-loss" : "text-accent";
        const timingColor: Record<NextActionTimingLevel, string> = {
          soon: "text-profit", possible: "text-accent",
          unlikely: "text-text-muted/60", blocked: "text-loss", none: "text-text-muted/40",
        };

        return (
          <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">

            {/* Card header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
              <Radio size={12} className={isRunning ? "text-profit" : "text-text-muted"} />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Live Status</p>
              {isRunning && (
                <span className="ml-auto flex items-center gap-1.5 text-2xs font-semibold text-profit">
                  <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
                  Monitoring · {live.scanFrequency.toLowerCase()}
                </span>
              )}
            </div>

            {/* Row 1: Current state + Watching */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60 border-b border-border/60">

              {/* Current state */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">Current State</p>
                <div className="flex items-start gap-2 mb-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", dotColor[live.level])} />
                  <p className="text-sm font-semibold text-text-primary leading-snug">{live.currentState}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {sessLastRef && (
                    <p className="text-2xs text-text-muted flex items-center gap-1">
                      <Activity size={9} />
                      Last check {timeAgo(sessLastRef)}
                    </p>
                  )}
                  {nextScan && (
                    <p className="text-2xs text-text-muted flex items-center gap-1">
                      <Clock size={9} />
                      Next check {nextScan}
                    </p>
                  )}
                </div>
              </div>

              {/* Watching breakdown */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">Watching</p>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-sm font-mono font-semibold text-text-primary">{live.watchSymbol}</span>
                  <span className="text-2xs font-mono text-text-muted bg-surface-3 border border-border rounded px-1.5 py-0.5">
                    {live.watchTimeframe}
                  </span>
                  {mktBadge(live.watchMarketState, live.watchMarketStateLabel)}
                </div>
                <p className="text-2xs text-text-muted">{live.watchStrategy}</p>
                {!isRunning && (
                  <p className="text-2xs text-text-muted/50 mt-1">{live.scanFrequency} when active</p>
                )}
              </div>
            </div>

            {/* Row 2: What it's looking for + Next action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60 border-b border-border/60">

              {/* What it's looking for */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">What it&apos;s looking for</p>
                <p className="text-xs text-text-secondary leading-relaxed">{live.watchingDetail}</p>
              </div>

              {/* Next action + timing + signal progress */}
              <div className="px-5 py-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2">Next Action</p>
                <p className="text-sm font-semibold text-text-primary leading-snug mb-1">{live.nextAction}</p>
                <p className="text-xs text-text-muted leading-relaxed mb-2">{live.nextActionTrigger}</p>
                <p className={cn("text-xs font-semibold", timingColor[live.nextActionTimingLevel])}>
                  {live.nextActionTiming}
                </p>

                {live.signalProgress !== "none" && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-2xs font-semibold", sigTextColor(live.signalProgress))}>
                        {live.signalProgressLabel}
                      </span>
                      {live.signalProgress !== "blocked" && (
                        <span className="text-2xs text-text-muted/50 font-mono">{live.signalProgressPct}%</span>
                      )}
                    </div>
                    <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", sigBarColor(live.signalProgress))}
                        style={{ width: `${live.signalProgressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Condition checks */}
            {live.conditionChecks.length > 0 && (
              <div className="px-5 py-4 bg-surface-0/40">
                <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-3">
                  Entry conditions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {live.conditionChecks.map((c) => (
                    <div key={c.label} className="flex items-start gap-2.5">
                      <span className={cn(
                        "shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-2xs font-bold",
                        c.met
                          ? "bg-profit/15 text-profit"
                          : "bg-loss/15 text-loss"
                      )}>
                        {c.met ? "✓" : "✗"}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-xs font-semibold", c.met ? "text-text-primary" : "text-text-secondary")}>
                          {c.label}
                        </p>
                        <p className="text-2xs text-text-muted leading-snug mt-0.5">{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ── Signal / Order preview panel ───────────────────────────────────── */}
      {shadowSignal && (() => {
        const sig      = shadowSignal;
        const isLivePrep = tradingMode === "live_prep";
        const fmtP     = (n: number) => `$${n.toFixed(2)}`;

        const confStyle: Record<string, string> = {
          high:   "text-profit bg-profit/10 border-profit/20",
          medium: "text-accent  bg-accent/10  border-accent/20",
          low:    "text-text-muted bg-surface-3 border-border",
        };

        const borderColor  = isLivePrep ? "border-amber-500/30" : "border-accent/30";
        const headerBg     = isLivePrep ? "bg-amber-400/[0.04]" : "bg-accent/[0.03]";
        const headerBorder = isLivePrep ? "border-amber-500/20" : "border-accent/20";
        const iconColor    = isLivePrep ? "text-amber-400" : "text-accent";
        const pillStyle    = isLivePrep
          ? "text-amber-400/80 bg-amber-400/10 border-dashed border-amber-400/40"
          : "text-accent/70   bg-accent/10    border-dashed border-accent/40";
        const dividerColor = isLivePrep ? "border-amber-500/15 divide-amber-500/10" : "border-accent/15 divide-accent/10";

        return (
          <div className={cn("rounded-2xl border overflow-hidden", borderColor)}>

            {/* Header */}
            <div className={cn("px-5 py-3.5 border-b flex items-center justify-between gap-3", headerBg, headerBorder)}>
              <div className="flex items-center gap-2">
                {isLivePrep ? <Zap size={12} className={iconColor} /> : <Eye size={12} className={iconColor} />}
                <p className={cn("text-xs font-semibold uppercase tracking-wider", iconColor)}>
                  {isLivePrep ? "Execution Preview" : "Signal Detected"}
                </p>
              </div>
              <span className={cn("text-2xs font-bold border rounded-full px-2.5 py-0.5", pillStyle)}>
                {isLivePrep ? "NOT SUBMITTED · EXECUTION DISABLED" : "SIMULATED · NO REAL ORDER"}
              </span>
            </div>

            {/* Title row */}
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-2xs font-bold px-2 py-0.5 rounded border text-profit bg-profit/10 border-profit/20 uppercase tracking-wider">
                  {isLivePrep ? "BUY" : "LONG"}
                </span>
                <p className="text-base font-bold text-text-primary">
                  {isLivePrep
                    ? `Would submit: BUY ${sessSymbol} — ${sessInterval}`
                    : `Would enter ${sessSymbol} on ${sessInterval}`}
                </p>
                <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded border capitalize ml-auto", confStyle[sig.confidence])}>
                  {sig.confidence} confidence
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{sig.reason}</p>
            </div>

            {/* Order spec grid */}
            <div className={cn("grid grid-cols-2 sm:grid-cols-4 border-t divide-x", dividerColor)}>
              {[
                {
                  label: isLivePrep ? "Entry price" : "Entry (approx)",
                  value: fmtP(sig.entryApprox),
                  sub:   isLivePrep ? "Market order" : "at last scan",
                  subC:  "text-text-muted",
                },
                {
                  label: "Stop Loss",
                  value: fmtP(sig.stopLoss),
                  sub:   `−${sig.stopLossPct.toFixed(2)}%${isLivePrep ? " · GTC Stop" : ""}`,
                  subC:  "text-loss",
                },
                {
                  label: "Take Profit",
                  value: fmtP(sig.takeProfit),
                  sub:   `+${sig.takeProfitPct.toFixed(2)}%${isLivePrep ? " · GTC Limit" : ""}`,
                  subC:  "text-profit",
                },
                {
                  label: "Risk : Reward",
                  value: `1 : ${sig.riskReward.toFixed(1)}`,
                  sub:   `${sig.positionSize} sh · $${sig.riskAmount.toFixed(0)} risk`,
                  subC:  "text-text-muted",
                },
              ].map(({ label, value, sub, subC }) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-2xs text-text-muted mb-0.5">{label}</p>
                  <p className="text-sm font-bold font-mono text-text-primary tabular-nums">{value}</p>
                  <p className={cn("text-2xs font-mono", subC)}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Live prep: execution conditions row */}
            {isLivePrep && (
              <div className={cn("px-5 py-3 border-t bg-surface-0/30", dividerColor.split(" ")[0])}>
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">Execution conditions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    `Order type: Market entry — fills at best available price`,
                    `Stop loss: GTC Stop order at $${fmtP(sig.stopLoss)} — cancels on fill`,
                    `Event guard: auto-cancel if high-impact event detected${pauseOnEvents ? " (enabled)" : " (disabled)"}`,
                    `Kill switch: immediate cancel if triggered`,
                  ].map((cond, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 size={11} className="text-amber-400/70 shrink-0 mt-0.5" />
                      <p className="text-2xs text-text-secondary leading-snug">{cond}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why this signal */}
            <div className={cn("px-5 py-3.5 border-t bg-surface-0/40", dividerColor.split(" ")[0])}>
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2.5">Why this signal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {sig.conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={11} className="text-profit shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary leading-snug">{c}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className={cn("px-5 py-2.5 border-t flex items-start gap-2", isLivePrep ? "bg-amber-400/[0.02]" : "bg-accent/[0.02]", dividerColor.split(" ")[0])}>
              <Info size={11} className={cn("shrink-0 mt-0.5 opacity-50", iconColor)} />
              <p className="text-2xs text-text-muted/70 leading-relaxed">
                {isLivePrep
                  ? "Entry price is based on last simulation data — real-time prices would be used on execution. Live execution is currently disabled. All safety limits, event guards, and the kill switch are enforced."
                  : "Entry price is approximate based on last simulation data. In live mode, real-time market prices would be used. All safety limits apply."}
              </p>
            </div>

          </div>
        );
      })()}

      {/* ── Execution readiness (live_prep only) ───────────────────────────── */}
      {tradingMode === "live_prep" && (() => {
        const allPassed = readiness.allBlockersPassed;

        return (
          <div className="rounded-2xl border border-border overflow-hidden">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border bg-surface-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} className={allPassed ? "text-profit" : "text-text-muted"} />
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Execution Readiness
                </p>
              </div>
              <span className={cn(
                "text-2xs font-semibold px-2.5 py-1 rounded-full border",
                allPassed
                  ? "text-profit bg-profit/10 border-profit/20"
                  : "text-text-muted bg-surface-3 border-border"
              )}>
                {readiness.passedBlockers}/{readiness.totalBlockers} checks passed
              </span>
            </div>

            {/* Check list */}
            <div className="divide-y divide-border/60 bg-surface-0">
              {readiness.checks.map(check => (
                <div key={check.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={cn(
                    "shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                    check.passed
                      ? "bg-profit/15"
                      : check.blocking
                      ? "bg-loss/15"
                      : "bg-amber-400/15"
                  )}>
                    {check.passed
                      ? <CheckCircle2 size={11} className="text-profit" />
                      : check.blocking
                      ? <XCircle      size={11} className="text-loss" />
                      : <AlertTriangle size={10} className="text-amber-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-xs font-semibold",
                        check.passed ? "text-text-primary" : check.blocking ? "text-text-secondary" : "text-amber-300"
                      )}>
                        {check.label}
                      </p>
                      {!check.blocking && (
                        <span className="text-2xs text-text-muted/50 bg-surface-3 border border-border rounded px-1">warning</span>
                      )}
                    </div>
                    <p className="text-2xs text-text-muted leading-snug mt-0.5">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Go live section */}
            <div className="px-5 py-4 border-t border-border bg-surface-1 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">Enable live trading</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {allPassed
                    ? "All readiness checks passed — live execution is architecturally ready."
                    : `${readiness.totalBlockers - readiness.passedBlockers} blocker${readiness.totalBlockers - readiness.passedBlockers !== 1 ? "s" : ""} must be resolved before going live.`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Lock size={12} className="text-text-muted/50" />
                <span className="text-xs font-medium text-text-muted bg-surface-3 border border-border rounded-lg px-3 py-1.5">
                  Coming in Stage 4
                </span>
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

      {/* ── Trade log ──────────────────────────────────────────────────────── */}
      {hasResults && (
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 bg-surface-1 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History size={12} className="text-text-muted" />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Simulated Trade History</p>
              {autoEnabled && (
                <span className="text-2xs font-semibold text-accent/70 bg-accent/8 border border-dashed border-accent/30 rounded px-1.5 py-0.5">
                  SHADOW MODE
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-2xs text-text-muted">
              {allTrades.length > 0 && (
                <span>{allTrades.length} trade{allTrades.length !== 1 ? "s" : ""}</span>
              )}
              {lastBarDate && (
                <span className="font-mono">as of {lastBarDate}</span>
              )}
            </div>
          </div>

          {/* Open positions banner */}
          {openPositions.length > 0 && openPositions.map((pos, i) => (
            <div key={i} className={cn(
              "flex items-center gap-3 px-5 py-3 border-b border-border text-xs",
              pos.unrealized_pnl >= 0
                ? "bg-profit/[0.04] border-b-profit/15"
                : "bg-loss/[0.04] border-b-loss/15"
            )}>
              <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse shrink-0" />
              <span className="font-semibold text-text-primary">In position</span>
              <span className="font-mono text-text-muted bg-surface-3 border border-border rounded px-1.5 py-0.5 text-2xs">
                {pos.symbol}
              </span>
              <span className="text-text-muted">{pos.shares.toFixed(2)} shares</span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">Entry <span className="font-mono text-text-secondary">${pos.entry_price.toFixed(2)}</span></span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">Now <span className="font-mono text-text-secondary">${pos.current_price.toFixed(2)}</span></span>
              <span className={cn("ml-auto font-mono font-semibold", pos.unrealized_pnl >= 0 ? "text-profit" : "text-loss")}>
                {pos.unrealized_pnl >= 0 ? "+" : ""}{pos.unrealized_pnl.toFixed(2)}
                <span className="text-2xs ml-1">
                  ({pos.unrealized_pct >= 0 ? "+" : ""}{pos.unrealized_pct.toFixed(1)}%)
                </span>
              </span>
              <span className="text-2xs text-text-muted font-medium">Unrealized</span>
            </div>
          ))}

          {/* Trades */}
          {recentTrades.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-text-muted">No closed trades yet.</p>
              <p className="text-xs text-text-muted/60 mt-1">Trades will appear here once the strategy closes its first position.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 bg-surface-0">
              {recentTrades.map((t, i) => {
                const isWin      = t.pnl >= 0;
                const direction  = t.exit_price >= t.entry_price ? "Long" : "Short";
                const closeReason = inferTradeCloseReason(t.pnl, t.return_pct);
                const exitDate   = new Date(t.timestamp);
                const dateStr    = exitDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const timeStr    = exitDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

                return (
                  <div key={i} className={cn(
                    "flex items-center gap-3 px-5 py-3 border-l-2",
                    isWin ? "border-l-profit/40" : "border-l-loss/40"
                  )}>
                    {/* Direction badge */}
                    <span className={cn(
                      "shrink-0 text-2xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider",
                      direction === "Long"
                        ? "text-profit bg-profit/10 border-profit/20"
                        : "text-loss bg-loss/10 border-loss/20"
                    )}>
                      {direction}
                    </span>

                    {/* Symbol */}
                    <span className="text-xs font-mono font-semibold text-text-primary w-14 shrink-0">
                      {t.symbol}
                    </span>

                    {/* Entry → Exit prices + close reason */}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <span className="font-mono">${t.entry_price.toFixed(2)}</span>
                        <ArrowRight size={10} className="text-text-muted/40 shrink-0" />
                        <span className={cn("font-mono font-semibold", isWin ? "text-profit" : "text-loss")}>
                          ${t.exit_price.toFixed(2)}
                        </span>
                      </div>
                      <p className={cn(
                        "text-2xs",
                        closeReason.startsWith("Stop") ? "text-loss/70"
                          : closeReason.startsWith("Take") ? "text-profit/70"
                          : "text-text-muted/60"
                      )}>
                        {closeReason}
                      </p>
                    </div>

                    {/* P&L */}
                    <div className="text-right shrink-0">
                      <p className={cn("text-xs font-mono font-bold tabular-nums", isWin ? "text-profit" : "text-loss")}>
                        {isWin ? "+" : ""}{t.pnl.toFixed(2)}
                      </p>
                      <p className={cn("text-2xs font-mono", isWin ? "text-profit/70" : "text-loss/70")}>
                        {t.return_pct >= 0 ? "+" : ""}{t.return_pct.toFixed(2)}%
                      </p>
                    </div>

                    {/* Time */}
                    <div className="text-right shrink-0 pl-2">
                      <p className="text-2xs font-mono text-text-muted">{dateStr}</p>
                      <p className="text-2xs font-mono text-text-muted/50">{timeStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note if truncated */}
          {allTrades.length > 20 && (
            <div className="px-5 py-3 bg-surface-1 border-t border-border text-center">
              <p className="text-2xs text-text-muted">
                Showing last 20 of {allTrades.length} trades
              </p>
            </div>
          )}
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
        maxDailyTrades={maxDailyTrades}
        dailyTradesCount={dailyTradesCount}
        trend={trend}
        equityVol={equityVol}
        eventGuard={guard ? {
          level: guard.level,
          eventName: guard.events[0]?.short ?? "Event",
          daysUntil: guard.daysUntil,
        } : null}
      />

      {/* ── Signal & execution order log ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <History size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Signal & Order Log
          </p>
          {executionOrders.length > 0 && (
            <span className="ml-auto text-2xs text-text-muted">{executionOrders.length} entries</span>
          )}
        </div>
        <div className="px-5 py-4">
          <ExecutionOrderLog orders={executionOrders} />
        </div>
      </div>

    </div>
  );
}
