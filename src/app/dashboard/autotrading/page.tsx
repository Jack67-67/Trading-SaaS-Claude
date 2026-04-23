import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot, Plus, TrendingUp, TrendingDown, Minus, Pause, ShieldX,
  Activity, Zap, AlertTriangle, CheckCircle2, Clock, ArrowRight,
  DollarSign, RefreshCw, Eye, BarChart2, ChevronRight,
  Link2, Link2Off, ShieldCheck, Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";
import { getTodayGuard } from "@/lib/economic-calendar";
import { EventGuard } from "@/components/dashboard/event-guard";
import {
  generateAutotradingRecommendations,
  computeLiveState,
  type AutotradingMetrics,
  type AutotradingRecommendation,
  type LiveState,
  type MarketStateLevel,
  type SignalProgress,
  type NextActionTimingLevel,
} from "@/lib/autotrading-ai";

type RawTrade = {
  timestamp: string;
  symbol: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  return_pct: number;
};

export const metadata: Metadata = { title: "Autotrading" };

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

const ACTION_LABEL: Record<string, string> = {
  autotrading_on:   "Autotrading enabled",
  autotrading_off:  "Autotrading disabled",
  controls_updated: "Safety limits updated",
  paused:           "Session paused",
  resumed:          "Session resumed",
  kill_switch:      "Kill switch activated",
};

// ── Data types ────────────────────────────────────────────────────────────────

type RawSession = Record<string, unknown>;

// Broker row from DB (cached data — no credentials)
type BrokerConnRow = {
  id:                    string;
  broker:                string;
  status:                string;
  display_name:          string | null;
  cached_buying_power:   number | null;
  cached_equity:         number | null;
  cached_account_status: string | null;
  cached_positions_count: number | null;
  last_verified_at:      string | null;
};

type TradingMode = "paper" | "shadow" | "live_prep" | "live";

type ParsedSession = {
  id: string;
  name: string;
  symbol: string;
  interval: string;
  status: string;
  startDate: string;
  lastRefreshed: string | null;
  initialCapital: number;
  autoEnabled: boolean;
  tradingMode: TradingMode;
  maxCapitalPct: number;
  maxWeeklyLoss: number;
  maxMonthlyLoss: number;
  pauseReason: string | null;
  lastAction: string | null;
  lastActionAt: string | null;
  metrics: AutotradingMetrics | null;
  currentEquity: number;
  returnPct: number | null;
  weeklyLossPct: number | null;
  monthlyLossPct: number | null;
  allocatedCapital: number;
  pnl: number;
  recentTrades: RawTrade[];
  totalTrades: number;
  brokerConnectionId: string | null;
};

function parseSession(raw: RawSession): ParsedSession {
  const DAY_MS = 86_400_000;
  const cap  = Number(raw.initial_capital) || 100_000;
  const capPct = Number(raw.max_capital_pct ?? 100);
  const results = (raw.last_results ?? null) as Record<string, unknown> | null;
  const metrics = (results?.metrics ?? null) as AutotradingMetrics | null;
  const curve   = (results?.equity_curve ?? []) as { timestamp: string; equity: number }[];

  const currentEquity = curve.length > 0 ? curve[curve.length - 1].equity : cap;
  const now = Date.now();
  const eq7d  = findEquityAt(curve, now - 7  * DAY_MS);
  const eq30d = findEquityAt(curve, now - 30 * DAY_MS);

  const allTrades = (results?.trades ?? []) as RawTrade[];

  return {
    id:            String(raw.id ?? ""),
    name:          String(raw.name ?? ""),
    symbol:        String(raw.symbol ?? ""),
    interval:      String(raw.interval ?? ""),
    status:        String(raw.status ?? "active"),
    startDate:     String(raw.start_date ?? ""),
    lastRefreshed: (raw.last_refreshed_at as string | null) ?? null,
    initialCapital: cap,
    autoEnabled:   Boolean(raw.autotrading_enabled ?? false),
    tradingMode:   (() => {
      const m = raw.trading_mode as string | null;
      if (m === "live_prep") return "live_prep";
      if (m === "shadow")    return "shadow";
      if (m === "paper")     return "paper";
      return Boolean(raw.autotrading_enabled) ? "shadow" : "paper";
    })() as TradingMode,
    maxCapitalPct: capPct,
    maxWeeklyLoss: Number(raw.max_weekly_loss_pct ?? 10),
    maxMonthlyLoss: Number(raw.max_monthly_loss_pct ?? 20),
    pauseReason:   (raw.pause_reason as string | null) ?? null,
    lastAction:    (raw.last_action as string | null) ?? null,
    lastActionAt:  (raw.last_action_at as string | null) ?? null,
    metrics,
    currentEquity,
    returnPct:     metrics?.total_return_pct ?? null,
    weeklyLossPct: eq7d  && eq7d  > 0 ? ((currentEquity - eq7d)  / eq7d)  * 100 : null,
    monthlyLossPct: eq30d && eq30d > 0 ? ((currentEquity - eq30d) / eq30d) * 100 : null,
    allocatedCapital: cap * (capPct / 100),
    pnl: currentEquity - cap,
    recentTrades: allTrades.slice(-5).reverse(),
    totalTrades: allTrades.length,
    brokerConnectionId: (raw.broker_connection_id as string | null) ?? null,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BROKER_BADGE: Record<string, string> = {
  alpaca_paper: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alpaca_live:  "bg-profit/10 text-profit border-profit/20",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Broker summary section ────────────────────────────────────────────────────

function BrokerSummarySection({
  brokers,
  sessions,
}: {
  brokers: BrokerConnRow[];
  sessions: ParsedSession[];
}) {
  const connected    = brokers.filter(b => b.status === "connected");
  const errored      = brokers.filter(b => b.status === "error");
  const totalBP      = connected.reduce((s, b) => s + (b.cached_buying_power ?? 0), 0);
  const linkedSessCount = sessions.filter(s => s.brokerConnectionId !== null).length;

  return (
    <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Link2 size={12} className={connected.length > 0 ? "text-profit" : "text-text-muted"} />
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Broker Accounts
        </p>
        <span className="ml-auto flex items-center gap-1 text-2xs text-text-muted/60 bg-surface-3 border border-border rounded px-2 py-0.5">
          <ShieldCheck size={9} className="text-profit/60" />
          Read-only · No orders placed
        </span>
      </div>

      {brokers.length === 0 ? (
        /* No broker connected */
        <div className="px-5 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-surface-3 flex items-center justify-center shrink-0">
              <Link2Off size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">No broker connected</p>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed max-w-sm">
                Connect an Alpaca account to see real capital and buying power alongside your strategy allocation.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 hover:border-border-hover transition-all shrink-0"
          >
            <Link2 size={11} />
            Connect broker
            <ChevronRight size={10} className="text-text-muted" />
          </Link>
        </div>
      ) : (
        <div>
          {/* Broker rows */}
          <div className="divide-y divide-border/50">
            {brokers.map(b => {
              const isConnected = b.status === "connected";
              const isError     = b.status === "error";
              const linkedCount = sessions.filter(s => s.brokerConnectionId === b.id).length;
              return (
                <div key={b.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                  {/* Status dot */}
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isConnected ? "bg-profit" : isError ? "bg-loss" : "bg-amber-400",
                  )} />
                  {/* Name + type badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {b.display_name ?? b.broker}
                    </span>
                    <span className={cn(
                      "text-2xs font-semibold px-1.5 py-0.5 rounded border shrink-0",
                      BROKER_BADGE[b.broker] ?? "bg-surface-3 text-text-muted border-border",
                    )}>
                      {b.broker === "alpaca_paper" ? "Paper" : "Live"}
                    </span>
                    {b.cached_account_status && (
                      <span className={cn(
                        "text-2xs font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                        b.cached_account_status === "ACTIVE"
                          ? "bg-profit/10 text-profit"
                          : "bg-amber-400/10 text-amber-400",
                      )}>
                        {b.cached_account_status}
                      </span>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 ml-auto flex-wrap text-right">
                    {b.cached_buying_power !== null && (
                      <div>
                        <p className="text-xs font-mono font-semibold text-text-primary">
                          {fmt$(b.cached_buying_power)}
                        </p>
                        <p className="text-2xs text-text-muted">buying power</p>
                      </div>
                    )}
                    {b.cached_equity !== null && (
                      <div>
                        <p className="text-xs font-mono text-text-secondary">
                          {fmt$(b.cached_equity)}
                        </p>
                        <p className="text-2xs text-text-muted">equity</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-text-muted">
                        {linkedCount} session{linkedCount !== 1 ? "s" : ""} linked
                      </p>
                      {b.last_verified_at && (
                        <p className="text-2xs text-text-muted/50">
                          Synced {relTime(b.last_verified_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: total + warnings + manage link */}
          <div className="px-5 py-3 border-t border-border/60 bg-surface-0/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {totalBP > 0 && (
                <div className="flex items-center gap-1.5">
                  <Wallet size={11} className="text-text-muted" />
                  <span className="text-xs text-text-muted">
                    Total buying power:
                  </span>
                  <span className="text-xs font-mono font-semibold text-text-primary">
                    {fmt$(totalBP)}
                  </span>
                </div>
              )}
              {errored.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-loss">
                  <AlertTriangle size={11} />
                  {errored.length} connection{errored.length !== 1 ? "s" : ""} have errors
                </span>
              )}
              {linkedSessCount < sessions.length && sessions.length > 0 && (
                <span className="text-2xs text-text-muted/60">
                  {sessions.length - linkedSessCount} session{sessions.length - linkedSessCount !== 1 ? "s" : ""} have no broker linked
                </span>
              )}
            </div>
            <Link
              href="/dashboard/settings"
              className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
            >
              Manage in Settings
              <ChevronRight size={10} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ running }: { running: boolean }) {
  return (
    <span className={cn(
      "inline-block w-2 h-2 rounded-full shrink-0",
      running ? "bg-profit animate-pulse" : "bg-text-muted/40"
    )} />
  );
}

function GlobalStatusHero({ sessions, brokers }: { sessions: ParsedSession[]; brokers: BrokerConnRow[] }) {
  const runSessions = sessions.filter(s => s.autoEnabled && s.status === "active");
  const pausedCount = sessions.filter(s => s.status === "paused").length;
  const stoppedCount = sessions.filter(s => s.status === "stopped").length;
  const running = runSessions.length > 0;
  const anyAutoEnabled = sessions.some(s => s.autoEnabled);

  const totalAllocated = sessions.reduce((a, s) => a + s.allocatedCapital, 0);
  const totalEquity    = sessions.reduce((a, s) => a + s.currentEquity, 0);
  const totalStarting  = sessions.reduce((a, s) => a + s.initialCapital, 0);
  const totalPnL       = totalEquity - totalStarting;
  const totalPnLPct    = totalStarting > 0 ? (totalPnL / totalStarting) * 100 : 0;
  const totalBrokerBP  = brokers
    .filter(b => b.status === "connected")
    .reduce((s, b) => s + (b.cached_buying_power ?? 0), 0);

  // Running since = earliest start_date among active auto sessions
  const oldestActive = runSessions.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )[0];

  const statusLabel  = running     ? "RUNNING"
    : pausedCount > 0              ? "PAUSED"
    : stoppedCount === sessions.length && sessions.length > 0 ? "STOPPED"
    : "OFF";

  const statusColor  = running     ? "text-profit"
    : pausedCount > 0              ? "text-amber-400"
    : stoppedCount > 0             ? "text-loss"
    : "text-text-muted";

  const borderColor  = running     ? "border-profit/20"
    : pausedCount > 0              ? "border-amber-500/20"
    : stoppedCount > 0             ? "border-loss/20"
    : "border-border";

  const bgColor      = running     ? "bg-profit/[0.03]"
    : pausedCount > 0              ? "bg-amber-500/[0.03]"
    : "bg-surface-1";

  return (
    <div className={cn("rounded-2xl border overflow-hidden", borderColor, bgColor)}>
      {/* Top accent line */}
      {running && (
        <div className="h-px bg-gradient-to-r from-transparent via-profit/50 to-transparent" />
      )}

      <div className="px-6 py-5">
        {/* Status row */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <StatusDot running={running} />
            <span className={cn("text-xs font-bold tracking-widest uppercase", statusColor)}>
              {statusLabel}
            </span>
            {(() => {
              const hasLivePrep = sessions.some(s => s.tradingMode === "live_prep");
              if (hasLivePrep) return (
                <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                  <Zap size={9} />
                  LIVE PREP
                </span>
              );
              if (anyAutoEnabled) return (
                <span className="text-2xs font-semibold text-accent bg-accent/10 border border-accent/25 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                  <Eye size={9} />
                  SHADOW MODE
                </span>
              );
              return (
                <span className="text-2xs font-semibold text-text-muted/50 bg-surface-3 border border-border rounded-full px-2.5 py-0.5">
                  PAPER / VIRTUAL
                </span>
              );
            })()}
          </div>
          <div className="flex items-center gap-4 text-2xs text-text-muted">
            {running && oldestActive && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Running {runningFor(oldestActive.startDate)}
              </span>
            )}
            <span>
              {runSessions.length} active · {pausedCount} paused · {stoppedCount} stopped
            </span>
          </div>
        </div>

        {/* Capital + PnL row */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
            <div>
              <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-0.5">Allocated</p>
              <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
                {fmt$(totalAllocated)}
              </p>
              {totalAllocated < totalStarting && (
                <p className="text-2xs text-text-muted/60 mt-0.5">of {fmt$(totalStarting)}</p>
              )}
            </div>
            <div>
              <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-0.5">Sim Equity</p>
              <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
                {fmt$(totalEquity)}
              </p>
            </div>
            <div>
              <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-0.5">Sim P&L</p>
              <p className={cn("text-xl font-bold font-mono tabular-nums", pnlColor(totalPnL))}>
                {totalPnL >= 0 ? "+" : ""}{fmt$(totalPnL)}
              </p>
              <p className={cn("text-2xs font-mono", pnlColor(totalPnLPct))}>
                {totalPnLPct >= 0 ? "+" : ""}{totalPnLPct.toFixed(2)}%
              </p>
            </div>
            <div className={cn(
              "col-span-2 sm:col-span-2 rounded-xl border px-3 py-2",
              totalBrokerBP > 0 ? "border-profit/20 bg-profit/[0.02]" : "border-border bg-surface-0",
            )}>
              <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-0.5 flex items-center gap-1">
                <Link2 size={9} className={totalBrokerBP > 0 ? "text-profit/60" : "text-text-muted/40"} />
                Broker Buying Power
              </p>
              {totalBrokerBP > 0 ? (
                <>
                  <p className="text-xl font-bold font-mono tabular-nums text-profit">
                    {fmt$(totalBrokerBP)}
                  </p>
                  {totalAllocated > 0 && (
                    <p className="text-2xs text-text-muted/70 mt-0.5">
                      Strategy uses {((totalAllocated / totalBrokerBP) * 100).toFixed(1)}% of BP
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-muted/50 mt-0.5">
                  No broker linked
                </p>
              )}
            </div>
          </div>
        )}

        {/* No autotrading configured hint */}
        {!anyAutoEnabled && sessions.length > 0 && (
          <p className="text-xs text-text-muted mt-3">
            Autotrading is off on all sessions. Select a session below to enable it.
          </p>
        )}
      </div>
    </div>
  );
}

function AlertsSection({
  sessions,
  guard,
}: {
  sessions: ParsedSession[];
  guard: ReturnType<typeof getTodayGuard>;
}) {
  // Collect AI warnings from all active autotrading sessions with metrics
  type WarningRow = { sessionName: string; sessionId: string; rec: AutotradingRecommendation };
  const warnings: WarningRow[] = sessions
    .filter(s => s.autoEnabled && s.metrics)
    .flatMap(s => {
      const recs = generateAutotradingRecommendations(s.metrics!, {
        weeklyLossPct: s.weeklyLossPct,
        monthlyLossPct: s.monthlyLossPct,
        maxWeeklyLossPct: s.maxWeeklyLoss,
        maxMonthlyLossPct: s.maxMonthlyLoss,
      });
      return recs
        .filter(r => r.severity !== "ok")
        .map(r => ({ sessionName: s.name, sessionId: s.id, rec: r }));
    });

  const hasEventWarning = guard && (guard.level === "danger" || guard.level === "caution");

  if (!hasEventWarning && warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Event guard */}
      {hasEventWarning && guard && (
        <EventGuard guard={guard} variant="compact" />
      )}

      {/* AI warnings */}
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 overflow-hidden">
          <div className="px-5 py-3 bg-surface-1 border-b border-amber-500/15 flex items-center gap-2">
            <Zap size={12} className="text-amber-400" />
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              AI Warnings
            </p>
            <span className="ml-auto text-2xs text-text-muted">
              {warnings.length} issue{warnings.length !== 1 ? "s" : ""} across active sessions
            </span>
          </div>
          <div className="divide-y divide-border/60 bg-surface-0">
            {warnings.slice(0, 5).map(({ sessionName, sessionId, rec }) => (
              <div key={`${sessionId}-${rec.id}`} className="flex items-start gap-3 px-5 py-3">
                <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-amber-300">{rec.title}</p>
                    <span className="text-2xs text-text-muted/60">{sessionName}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{rec.body}</p>
                </div>
                <Link
                  href={`/dashboard/autotrading/${sessionId}`}
                  className="shrink-0 text-2xs text-accent hover:text-accent-hover transition-colors whitespace-nowrap"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ sess, broker }: { sess: ParsedSession; broker: BrokerConnRow | null }) {
  const isStopped = sess.status === "stopped";
  const isPaused  = sess.status === "paused";
  const isRunning = sess.autoEnabled && !isStopped && !isPaused;

  // Compute live state once — used for both the strip and signal badge
  const live = computeLiveState({
    status:        sess.status,
    autoEnabled:   sess.autoEnabled,
    pauseReason:   sess.pauseReason,
    symbol:        sess.symbol,
    interval:      sess.interval,
    lastRefreshed: sess.lastRefreshed,
    metrics:       sess.metrics,
  });
  const hasSignalDetected = isRunning && live.signalProgress === "ready";

  const hasWarning = sess.metrics && sess.autoEnabled && (() => {
    const recs = generateAutotradingRecommendations(sess.metrics!, {
      weeklyLossPct: sess.weeklyLossPct,
      monthlyLossPct: sess.monthlyLossPct,
      maxWeeklyLossPct: sess.maxWeeklyLoss,
      maxMonthlyLossPct: sess.maxMonthlyLoss,
    });
    return recs.some(r => r.severity === "warning");
  })();

  return (
    <Link
      href={`/dashboard/autotrading/${sess.id}`}
      className={cn(
        "block rounded-2xl border bg-surface-1 hover:bg-surface-2 transition-colors group",
        isStopped ? "border-loss/20"
          : isPaused  ? "border-amber-500/20"
          : isRunning && hasWarning ? "border-amber-500/20"
          : isRunning ? "border-profit/15"
          : "border-border"
      )}
    >
      <div className="px-5 py-4">
        {/* Top row: icon + name + status badges */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            isStopped ? "bg-loss/10"
              : isPaused  ? "bg-amber-500/10"
              : isRunning ? "bg-profit/10"
              : "bg-surface-3"
          )}>
            {isStopped ? <ShieldX size={14} className="text-loss" />
              : isPaused  ? <Pause   size={14} className="text-amber-400" />
              : isRunning ? <Bot     size={14} className="text-profit" />
              : <Activity  size={14} className="text-text-muted" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                {sess.name}
              </p>
              {isStopped && (
                <span className="text-2xs font-semibold text-loss bg-loss/10 border border-loss/20 rounded-full px-2 py-0.5">Stopped</span>
              )}
              {isPaused && (
                <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">Paused</span>
              )}
              {isRunning && !hasWarning && !hasSignalDetected && (
                <span className="text-2xs font-semibold text-profit bg-profit/10 border border-profit/20 rounded-full px-2 py-0.5">Running</span>
              )}
              {/* Trading mode badge (subtle — only when not obvious from status) */}
              {!isStopped && !isPaused && sess.tradingMode === "live_prep" && (
                <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Zap size={9} />
                  Live Prep
                </span>
              )}
              {isRunning && hasWarning && (
                <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">Warning</span>
              )}
              {hasSignalDetected && (
                <span className="text-2xs font-semibold text-accent bg-accent/10 border border-accent/25 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Eye size={9} />
                  Signal detected
                </span>
              )}
              {!sess.autoEnabled && !isStopped && (
                <span className="text-2xs text-text-muted/50 bg-surface-3 border border-border rounded-full px-2 py-0.5">Auto off</span>
              )}
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.symbol}</span>
              <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.interval}</span>
              <span className="text-2xs text-text-muted">
                {fmt$(sess.allocatedCapital)} allocated
              </span>
              {sess.startDate && (
                <span className="text-2xs text-text-muted flex items-center gap-1">
                  <Clock size={9} />
                  Running {runningFor(sess.startDate)}
                </span>
              )}
            </div>
          </div>

          <ArrowRight size={13} className="text-text-muted/40 group-hover:text-accent transition-colors shrink-0 mt-1.5" />
        </div>

        {/* Pause reason */}
        {isPaused && sess.pauseReason && (
          <p className="mt-2.5 ml-11 text-xs text-amber-400/80 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg px-3 py-2 leading-relaxed">
            {sess.pauseReason}
          </p>
        )}

        {/* Live state strip */}
        <LiveStateStrip live={live} />

        {/* Metrics row */}
        {sess.metrics && (
          <div className="mt-3 ml-11 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 border-t border-border/60 pt-3">
            <div>
              <p className="text-2xs text-text-muted">{sess.tradingMode === "live" ? "Backtest return" : "Total return"}</p>
              <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(sess.returnPct ?? 0))}>
                {sess.returnPct !== null ? formatPercent(sess.returnPct) : "—"}
              </p>
            </div>
            <div>
              <p className="text-2xs text-text-muted">Sharpe</p>
              <p className={cn(
                "text-sm font-mono font-bold tabular-nums",
                (sess.metrics.sharpe_ratio ?? 0) >= 1 ? "text-profit"
                  : (sess.metrics.sharpe_ratio ?? 0) < 0.5 ? "text-loss"
                  : "text-text-primary"
              )}>
                {(sess.metrics.sharpe_ratio ?? 0).toFixed(2)}
              </p>
            </div>
            {sess.weeklyLossPct !== null && (
              <div>
                <p className="text-2xs text-text-muted">7-day P&L</p>
                <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(sess.weeklyLossPct))}>
                  {sess.weeklyLossPct >= 0 ? "+" : ""}{sess.weeklyLossPct.toFixed(1)}%
                </p>
              </div>
            )}
            <div>
              <p className="text-2xs text-text-muted">Last check</p>
              <p className="text-sm font-mono text-text-muted/70">
                {sess.lastRefreshed ? timeAgo(sess.lastRefreshed) : "Never"}
              </p>
            </div>
          </div>
        )}

        {/* Mini trade log */}
        <MiniTradeLog trades={sess.recentTrades} totalTrades={sess.totalTrades} />

        {/* Broker status row — shown when autotrading is active */}
        {sess.autoEnabled && (
          <div className={cn(
            "mt-3 ml-11 pt-2.5 border-t border-border/60 flex items-center gap-2",
          )}>
            {broker ? (
              <>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  broker.status === "connected" ? "bg-profit" : "bg-loss",
                )} />
                <span className={cn(
                  "text-2xs font-semibold px-1.5 py-0.5 rounded border shrink-0",
                  BROKER_BADGE[broker.broker] ?? "bg-surface-3 text-text-muted border-border",
                )}>
                  {broker.broker === "alpaca_paper" ? "Paper" : "Live"}
                </span>
                <span className="text-2xs text-text-muted truncate">
                  {broker.display_name ?? broker.broker}
                </span>
                {broker.cached_buying_power !== null && (
                  <span className="text-2xs font-mono text-text-secondary ml-auto shrink-0">
                    {fmt$(broker.cached_buying_power)} BP
                  </span>
                )}
                <span className="text-2xs text-text-muted/50 flex items-center gap-1 shrink-0">
                  <ShieldCheck size={9} className="text-profit/50" />
                  Read-only
                </span>
              </>
            ) : (
              <>
                <Link2Off size={10} className="text-text-muted/40 shrink-0" />
                <span className="text-2xs text-text-muted/50">No broker linked</span>
                {(sess.tradingMode === "shadow" || sess.tradingMode === "live_prep") && (
                  <span className="text-2xs text-amber-400/70 ml-auto">
                    Link a broker to enable readiness checks
                  </span>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </Link>
  );
}

// ── Live state strip (inside session cards) ───────────────────────────────────

const LIVE_DOT: Record<string, string> = {
  scanning: "bg-profit animate-pulse",
  active:   "bg-profit",
  waiting:  "bg-text-muted/40",
  paused:   "bg-amber-400",
  stopped:  "bg-loss",
  off:      "bg-text-muted/25",
};

function MarketStateBadge({ level, label }: { level: MarketStateLevel; label: string }) {
  return (
    <span className={cn(
      "inline-block text-2xs font-semibold px-1.5 py-0.5 rounded-full border mt-1",
      level === "trending"  && "text-profit    bg-profit/10    border-profit/20",
      level === "sideways"  && "text-accent     bg-accent/10    border-accent/20",
      level === "volatile"  && "text-amber-400  bg-amber-400/10 border-amber-400/20",
      level === "mixed"     && "text-text-muted bg-surface-3    border-border",
      level === "unknown"   && "text-text-muted/50 bg-surface-3/50 border-border/40",
    )}>
      {label}
    </span>
  );
}

function SignalProgressBar({ progress, label, pct }: { progress: SignalProgress; label: string; pct: number }) {
  if (progress === "none") return null;
  const barColor =
    progress === "ready"   ? "bg-profit" :
    progress === "partial" ? "bg-amber-400" :
    progress === "blocked" ? "bg-loss" :
    "bg-accent";
  const textColor =
    progress === "ready"   ? "text-profit" :
    progress === "partial" ? "text-amber-400" :
    progress === "blocked" ? "text-loss" :
    "text-accent";
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn("text-2xs font-semibold", textColor)}>{label}</span>
        {progress !== "blocked" && (
          <span className="text-2xs text-text-muted/50 font-mono">{pct}%</span>
        )}
      </div>
      <div className="h-0.5 bg-surface-3 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const TIMING_COLOR: Record<NextActionTimingLevel, string> = {
  soon:     "text-profit",
  possible: "text-accent",
  unlikely: "text-text-muted/60",
  blocked:  "text-loss",
  none:     "text-text-muted/40",
};

function LiveStateStrip({ live }: { live: LiveState }) {
  return (
    <div className="mt-3 ml-11 grid grid-cols-3 gap-4 border-t border-border/60 pt-3">

      {/* Current state */}
      <div>
        <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-1.5">Current state</p>
        <div className="flex items-start gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-[3px]", LIVE_DOT[live.level])} />
          <p className="text-xs font-semibold text-text-primary leading-snug">{live.currentState}</p>
        </div>
      </div>

      {/* Watching */}
      <div>
        <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-1.5">Watching</p>
        <p className="text-xs font-mono text-text-secondary">{live.watchSymbol} · {live.watchTimeframe}</p>
        <p className="text-2xs text-text-muted mt-0.5">{live.watchStrategy}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <MarketStateBadge level={live.watchMarketState} label={live.watchMarketStateLabel} />
          <span className="text-2xs text-text-muted/50">{live.scanFrequency}</span>
        </div>
      </div>

      {/* Next action + timing */}
      <div>
        <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-1.5">Next action</p>
        <p className="text-xs text-text-secondary leading-snug">{live.nextAction}</p>
        <p className={cn("text-2xs mt-1 leading-snug", TIMING_COLOR[live.nextActionTimingLevel])}>
          {live.nextActionTiming}
        </p>
        <SignalProgressBar
          progress={live.signalProgress}
          label={live.signalProgressLabel}
          pct={live.signalProgressPct}
        />
      </div>

    </div>
  );
}

// ── Mini trade log (last 5 trades, compact) ───────────────────────────────────

function MiniTradeLog({ trades, totalTrades }: { trades: RawTrade[]; totalTrades: number }) {
  if (trades.length === 0) return null;
  return (
    <div className="mt-3 ml-11 border-t border-border/60 pt-3">
      <p className="text-2xs text-text-muted/60 uppercase tracking-wider font-semibold mb-1.5">
        Last trades · {totalTrades} total
      </p>
      <div className="space-y-1">
        {trades.map((t, i) => {
          const isWin = t.pnl >= 0;
          const dir   = t.exit_price >= t.entry_price ? "L" : "S";
          const date  = new Date(t.timestamp);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div key={i} className={cn("flex items-center gap-2 border-l-2 pl-2", isWin ? "border-l-profit/40" : "border-l-loss/40")}>
              <span className={cn(
                "text-2xs font-bold px-1 rounded border shrink-0",
                dir === "L" ? "text-profit bg-profit/10 border-profit/20" : "text-loss bg-loss/10 border-loss/20"
              )}>{dir}</span>
              <span className="text-2xs font-mono text-text-muted/70 flex-1 truncate">
                ${t.entry_price.toFixed(2)} → ${t.exit_price.toFixed(2)}
              </span>
              <span className={cn("text-2xs font-mono font-semibold tabular-nums shrink-0", isWin ? "text-profit" : "text-loss")}>
                {isWin ? "+" : ""}{t.return_pct.toFixed(2)}%
              </span>
              <span className="text-2xs font-mono text-text-muted/40 shrink-0 w-12 text-right">{dateStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed({ sessions }: { sessions: ParsedSession[] }) {
  const feed = sessions
    .filter(s => s.lastAction && s.lastActionAt)
    .map(s => ({
      sessionId:   s.id,
      sessionName: s.name,
      symbol:      s.symbol,
      action:      s.lastAction!,
      at:          s.lastActionAt!,
    }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  if (feed.length === 0) return null;

  const actionColor = (action: string) => {
    if (action === "kill_switch") return "text-loss";
    if (action === "paused")      return "text-amber-400";
    if (action === "resumed" || action === "autotrading_on") return "text-profit";
    return "text-text-muted";
  };

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-3.5 bg-surface-1 border-b border-border flex items-center gap-2">
        <RefreshCw size={12} className="text-text-muted" />
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Recent Activity</p>
      </div>
      <div className="divide-y divide-border/50 bg-surface-0">
        {feed.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
              "bg-loss":        item.action === "kill_switch",
              "bg-amber-400":   item.action === "paused",
              "bg-profit":      item.action === "resumed" || item.action === "autotrading_on",
              "bg-accent":      item.action === "controls_updated",
              "bg-text-muted/40": !["kill_switch","paused","resumed","autotrading_on","controls_updated"].includes(item.action),
            })} />
            <div className="flex-1 min-w-0">
              <span className={cn("text-xs font-semibold", actionColor(item.action))}>
                {ACTION_LABEL[item.action] ?? item.action}
              </span>
              <span className="text-xs text-text-muted ml-2">{item.sessionName}</span>
              <span className="text-2xs font-mono text-text-muted/50 ml-1.5 bg-surface-3 rounded px-1">{item.symbol}</span>
            </div>
            <span className="text-2xs text-text-muted/50 shrink-0 font-mono">{timeAgo(item.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AutotradingPage() {
  let renderError: string | null = null;
  let sessions: ParsedSession[] = [];
  let brokers: BrokerConnRow[]  = [];

  try {
    const supabase = createClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) console.error("[autotrading/list] auth error:", authErr.message);
    if (!user) redirect("/auth/login");

    // select("*") is safe — missing columns (pre-migration) are just absent, not an error
    const { data, error } = await supabase
      .from("paper_trade_sessions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }) as unknown as {
        data: RawSession[] | null;
        error: { message: string; code?: string } | null;
      };

    if (error) {
      renderError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
    } else {
      sessions = (data ?? []).map(parseSession);
    }

    // Fetch broker connections (cached data — no credentials, pre-migration safe)
    try {
      const db = supabase as any;
      const { data: bData } = await db
        .from("broker_connections")
        .select("id, broker, status, display_name, cached_buying_power, cached_equity, cached_account_status, cached_positions_count, last_verified_at")
        .eq("user_id", user!.id) as { data: BrokerConnRow[] | null };
      brokers = bData ?? [];
    } catch { /* broker_connections table may not exist yet */ }

  } catch (e) {
    if (e != null && typeof e === "object" && "digest" in e) throw e;
    renderError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // Build broker lookup map for session cards
  const brokerById = new Map<string, BrokerConnRow>(brokers.map(b => [b.id, b]));

  const guard = getTodayGuard();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot size={18} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Autotrading</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Control Center</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Monitor strategies, manage broker connections, and track capital.
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

      {/* ── DB error ───────────────────────────────────────────────────────── */}
      {renderError && (
        <div className="rounded-xl border border-loss/40 bg-loss/5 px-5 py-4 space-y-1">
          <p className="text-xs font-bold text-loss uppercase tracking-wider">Error loading sessions</p>
          <p className="text-xs font-mono text-text-secondary break-all">{renderError}</p>
        </div>
      )}

      {/* ── Migration hint (shown when no session has autotrading fields) ─── */}
      {!renderError && sessions.length > 0 && sessions.every(s => !s.autoEnabled && s.lastAction === null) && (
        <div className="rounded-xl border border-accent/15 bg-accent/[0.03] px-5 py-4 space-y-2">
          <p className="text-xs font-semibold text-text-primary flex items-center gap-2">
            <Zap size={11} className="text-accent" />
            Run migration to enable autotrading controls
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Autotrading requires extra columns in your database. Run{" "}
            <code className="bg-surface-3 border border-border rounded px-1 py-0.5 text-text-secondary">
              supabase/migrations/00004_autotrading.sql
            </code>{" "}
            in <strong className="text-text-secondary">Supabase → SQL Editor</strong>.
          </p>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!renderError && sessions.length === 0 && (
        <div className="rounded-2xl border border-border border-dashed bg-surface-1 px-8 py-14 text-center">
          <Bot size={32} className="mx-auto text-text-muted/30 mb-4" />
          <p className="text-sm font-semibold text-text-secondary mb-1">No sessions yet</p>
          <p className="text-xs text-text-muted mb-5 max-w-xs mx-auto">
            Create a paper trading session first, then enable autotrading on it here.
          </p>
          <Link
            href="/dashboard/paper-trading/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            <Plus size={13} />
            Create Session
          </Link>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          {/* ── Global status hero ───────────────────────────────────────── */}
          <GlobalStatusHero sessions={sessions} brokers={brokers} />

          {/* ── Broker accounts summary ──────────────────────────────────── */}
          <BrokerSummarySection brokers={brokers} sessions={sessions} />

          {/* ── Event guard + AI warnings ───────────────────────────────── */}
          <AlertsSection sessions={sessions} guard={guard} />

          {/* ── Portfolio Overview link ──────────────────────────────────── */}
          <Link
            href="/dashboard/autotrading/portfolio"
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-5 py-4 hover:bg-surface-2 hover:border-border-hover transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <BarChart2 size={14} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Portfolio Overview</p>
                <p className="text-xs text-text-muted">Multi-strategy risk controls, portfolio kill switch, order log</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-text-muted group-hover:text-text-secondary transition-colors" />
          </Link>

          {/* ── Session list ─────────────────────────────────────────────── */}
          <div>
            <p className="text-2xs font-semibold text-text-muted/60 uppercase tracking-widest mb-3 pl-1">
              Sessions — {sessions.length} total
            </p>
            <div className="space-y-3">
              {sessions.map(sess => (
                <SessionCard
                  key={sess.id}
                  sess={sess}
                  broker={sess.brokerConnectionId ? (brokerById.get(sess.brokerConnectionId) ?? null) : null}
                />
              ))}
            </div>
          </div>

          {/* ── Activity feed ─────────────────────────────────────────────── */}
          <ActivityFeed sessions={sessions} />
        </>
      )}

    </div>
  );
}
