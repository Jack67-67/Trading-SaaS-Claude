// ── Autotrading AI recommendations ──────────────────────────────────────────
// Pure logic — no LLM. Generates actionable recommendations from metrics.

export interface AutotradingMetrics {
  total_return_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  total_trades: number;
  profit_factor: number;
}

export interface AutotradingRecommendation {
  id: string;
  severity: "warning" | "info" | "ok";
  title: string;
  body: string;
  suggestedAction?: "pause" | "reduce_capital" | "review";
}

interface SafetySnapshot {
  weeklyLossPct: number | null;   // negative = loss
  monthlyLossPct: number | null;  // negative = loss
  maxWeeklyLossPct: number;
  maxMonthlyLossPct: number;
}

// ── Event-driven recommendations ──────────────────────────────────────────────
// Accepts a simplified guard shape so this file stays import-free.

interface SimpleGuard {
  level: string;          // "danger" | "caution" | "upcoming"
  daysUntil: number;
  events: Array<{
    id: string;
    short: string;
    category: string;
    impact: string;
    description: string;
  }>;
}

/**
 * Returns event-specific recommendations based on today's economic calendar
 * guard and the session's pause_on_events setting.
 * Uses the same AutotradingRecommendation interface so they render in the
 * same UI components as metric-based recommendations.
 */
export function generateEventRecommendations(
  guard: SimpleGuard | null,
  pauseOnEvents: boolean,
): AutotradingRecommendation[] {
  if (!guard || guard.level === "upcoming") return [];

  const event = guard.events.find(e => e.impact === "high") ?? guard.events[0];
  const dayDesc = guard.daysUntil === 0 ? "today"
    : guard.daysUntil === 1 ? "tomorrow"
    : `in ${guard.daysUntil} days`;

  const isHigh = event.impact === "high";
  const isDanger = guard.level === "danger";

  // Pausing automatically → confirm it in the recommendation
  if (pauseOnEvents && isDanger) {
    return [{
      id: `event-autopause-${event.id}`,
      severity: "warning",
      title: `Auto-pausing — ${event.short} ${dayDesc}`,
      body: `Autotrading is configured to pause automatically for high-impact events. ${event.description}`,
      suggestedAction: undefined,
    }];
  }

  // Danger + not auto-pausing → urgent action recommendation
  if (isDanger && isHigh) {
    const action: Record<string, string> = {
      fomc: "Pause autotrading — Fed decisions cause sharp, unpredictable moves across all instruments.",
      cpi:  "Avoid new entries — CPI surprises create gap risk at the open and can invalidate intraday setups.",
      nfp:  "Pause or avoid entries — NFP causes first-hour volatility that can stop out otherwise-valid setups.",
    };
    return [{
      id: `event-danger-${event.id}`,
      severity: "warning",
      title: `${event.short} ${dayDesc} — high volatility risk`,
      body: action[event.category] ?? `${event.description} Consider pausing until the event passes.`,
      suggestedAction: "pause",
    }];
  }

  // Caution window → reduce risk recommendation
  return [{
    id: `event-caution-${event.id}`,
    severity: "info",
    title: `${event.short} ${dayDesc} — reduce risk`,
    body: `${event.description} Consider reducing capital allocation or tightening loss limits before the event.`,
    suggestedAction: "reduce_capital",
  }];
}

export function generateAutotradingRecommendations(
  metrics: AutotradingMetrics,
  safety: SafetySnapshot,
  trend?: PerformanceTrend | null,
  equityVol?: EquityVolatility,
): AutotradingRecommendation[] {
  const recs: AutotradingRecommendation[] = [];

  // ── Return / Sharpe ───────────────────────────────────────────────────────

  if (metrics.sharpe_ratio < 0) {
    recs.push({
      id: "negative_sharpe",
      severity: "warning",
      title: "Negative risk-adjusted return",
      body: `Sharpe ${metrics.sharpe_ratio.toFixed(2)} — the strategy is losing more than it earns after accounting for volatility. Consider pausing until the edge returns.`,
      suggestedAction: "pause",
    });
  } else if (metrics.sharpe_ratio < 0.5) {
    recs.push({
      id: "low_sharpe",
      severity: "info",
      title: "Low risk-adjusted return",
      body: `Sharpe ${metrics.sharpe_ratio.toFixed(2)} is below the 0.5 threshold. The strategy is marginally profitable but may not justify the capital deployed.`,
      suggestedAction: "review",
    });
  }

  // ── Drawdown ──────────────────────────────────────────────────────────────

  if (metrics.max_drawdown_pct > 25) {
    recs.push({
      id: "severe_drawdown",
      severity: "warning",
      title: "Severe drawdown",
      body: `Max drawdown −${metrics.max_drawdown_pct.toFixed(1)}% exceeds the 25% threshold. Reducing capital allocation would cap further downside.`,
      suggestedAction: "reduce_capital",
    });
  } else if (metrics.max_drawdown_pct > 15) {
    recs.push({
      id: "elevated_drawdown",
      severity: "info",
      title: "Elevated drawdown",
      body: `Max drawdown −${metrics.max_drawdown_pct.toFixed(1)}% is above the 15% comfort level. Monitor closely.`,
    });
  }

  // ── Win rate ──────────────────────────────────────────────────────────────

  if (metrics.win_rate_pct < 35 && metrics.total_trades >= 5) {
    recs.push({
      id: "low_winrate",
      severity: "warning",
      title: "Win rate critically low",
      body: `${metrics.win_rate_pct.toFixed(0)}% win rate — fewer than 1 in 3 trades is profitable. This is below the minimum floor for most systematic strategies.`,
      suggestedAction: "review",
    });
  }

  // ── Profit factor ─────────────────────────────────────────────────────────

  if (metrics.profit_factor < 1 && metrics.total_trades >= 5) {
    recs.push({
      id: "pf_below_one",
      severity: "warning",
      title: "Losing money per trade",
      body: `Profit factor ${metrics.profit_factor.toFixed(2)} — average losses exceed average wins. The strategy is net-negative on a per-trade basis.`,
      suggestedAction: "pause",
    });
  }

  // ── Approaching loss limits ───────────────────────────────────────────────

  if (safety.weeklyLossPct !== null && safety.weeklyLossPct < 0) {
    const remaining = safety.maxWeeklyLossPct + safety.weeklyLossPct;
    if (remaining >= 0 && remaining < 2) {
      recs.push({
        id: "near_weekly_limit",
        severity: "warning",
        title: "Near weekly loss limit",
        body: `Weekly P&L at ${safety.weeklyLossPct.toFixed(1)}% — only ${remaining.toFixed(1)}pp before the auto-pause limit (−${safety.maxWeeklyLossPct}%) triggers.`,
      });
    }
  }

  if (safety.monthlyLossPct !== null && safety.monthlyLossPct < 0) {
    const remaining = safety.maxMonthlyLossPct + safety.monthlyLossPct;
    if (remaining >= 0 && remaining < 3) {
      recs.push({
        id: "near_monthly_limit",
        severity: "info",
        title: "Approaching monthly loss limit",
        body: `Monthly P&L at ${safety.monthlyLossPct.toFixed(1)}% — ${remaining.toFixed(1)}pp buffer remaining before auto-pause (−${safety.maxMonthlyLossPct}%).`,
      });
    }
  }

  // ── Performance trend ─────────────────────────────────────────────────────

  if (trend && trend.level !== "insufficient") {
    if (trend.level === "declining" && trend.consecutiveLosses >= 4) {
      recs.push({
        id: "trend_consecutive_losses",
        severity: "warning",
        title: `${trend.consecutiveLosses} consecutive losing trades`,
        body: `The last ${trend.consecutiveLosses} trades all closed at a loss. Reduce capital allocation by at least 50% and wait for 2 consecutive profitable trades before restoring full size.`,
        suggestedAction: "reduce_capital",
      });
    } else if (trend.level === "declining" && trend.deteriorating) {
      recs.push({
        id: "trend_deteriorating",
        severity: "warning",
        title: "Strategy performance degrading",
        body: `Recent win rate ${trend.recentWinRate.toFixed(0)}% vs ${trend.overallWinRate.toFixed(0)}% historical. The edge is shrinking — consider pausing until you see 3 profitable trades in a row.`,
        suggestedAction: "pause",
      });
    } else if (trend.level === "volatile") {
      recs.push({
        id: "trend_volatile",
        severity: "info",
        title: "Inconsistent recent results",
        body: `${trend.insight} Tighten stop-loss or reduce position size to limit exposure during unstable conditions.`,
        suggestedAction: "reduce_capital",
      });
    } else if (trend.level === "improving" && recs.filter(r => r.severity !== "ok").length === 0) {
      recs.push({
        id: "trend_improving",
        severity: "info",
        title: "Positive momentum",
        body: trend.insight + " Strategy is performing above its historical baseline.",
      });
    }
  }

  // ── Equity volatility ─────────────────────────────────────────────────────

  if (equityVol === "high") {
    const hasVolWarn = recs.some(r => r.id === "severe_drawdown" || r.id === "trend_volatile");
    if (!hasVolWarn) {
      recs.push({
        id: "equity_high_vol",
        severity: "warning",
        title: "High equity curve volatility",
        body: "Recent session returns are unusually large swing-to-swing. This pattern often precedes larger drawdowns. Reduce capital allocation or tighten loss limits.",
        suggestedAction: "reduce_capital",
      });
    }
  }

  // ── All clear ─────────────────────────────────────────────────────────────

  if (recs.length === 0) {
    recs.push({
      id: "all_clear",
      severity: "ok",
      title: "All checks passed",
      body: `Sharpe ${metrics.sharpe_ratio.toFixed(2)}, drawdown −${metrics.max_drawdown_pct.toFixed(1)}%, win rate ${metrics.win_rate_pct.toFixed(0)}%. No issues detected.`,
    });
  }

  return recs;
}

// ── Live state ────────────────────────────────────────────────────────────────
// Derives what the session is doing *right now* from status + metrics + timing.
// No LLM — all inference is from available DB fields.

export type LiveStateLevel        = "scanning" | "active" | "waiting" | "paused" | "stopped" | "off";
export type MarketStateLevel      = "trending" | "sideways" | "volatile" | "mixed" | "unknown";
export type SignalProgress        = "none" | "forming" | "partial" | "ready" | "blocked";
export type NextActionTimingLevel = "soon" | "possible" | "unlikely" | "blocked" | "none";

export interface ConditionCheck {
  label: string;   // "Profitable edge"
  detail: string;  // "Profit factor 1.8 — strategy makes more than it loses"
  met: boolean;
}

export interface LiveState {
  level: LiveStateLevel;
  currentState: string;

  // Watching breakdown
  watchSymbol: string;
  watchTimeframe: string;
  watchStrategy: string;
  watchMarketState: MarketStateLevel;
  watchMarketStateLabel: string;
  watchingDetail: string;

  // Scan frequency
  scanFrequency: string;        // "Every 15 minutes", "On each new 4-hour candle"

  // Next action
  nextAction: string;
  nextActionTrigger: string;
  nextActionTiming: string;           // "Next possible trade within 1–2 candles"
  nextActionTimingLevel: NextActionTimingLevel;

  // Signal progress
  signalProgress: SignalProgress;
  signalProgressLabel: string;
  signalProgressPct: number;

  // Condition breakdown — "why no trade yet"
  conditionChecks: ConditionCheck[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function timeframeLabel(interval: string): string {
  const map: Record<string, string> = {
    "1m": "1-min bars",  "3m": "3-min bars",  "5m": "5-min bars",
    "15m": "15-min bars", "30m": "30-min bars",
    "1h": "1-hour bars",  "2h": "2-hour bars",  "4h": "4-hour bars",
    "1d": "Daily bars",   "3d": "3-day bars",   "1w": "Weekly bars",
  };
  return map[interval] ?? `${interval} bars`;
}

function deriveStrategy(interval: string, m: AutotradingMetrics | null): string {
  if (!m) {
    if (["1m","3m","5m"].includes(interval))   return "Scalp & momentum";
    if (["15m","30m"].includes(interval))       return "Intraday breakout";
    if (["1h","2h","4h"].includes(interval))    return "Swing momentum";
    if (["1d","3d","1w"].includes(interval))    return "Trend following";
    return "Technical signals";
  }
  if (m.profit_factor > 2.0 && m.win_rate_pct < 50) return "Trend following";
  if (m.win_rate_pct > 58   && m.profit_factor < 1.8) return "Mean reversion";
  if (m.sharpe_ratio > 0.8)                           return "Momentum";
  if (["1d","3d","1w"].includes(interval))            return "Position trading";
  return "Technical breakout";
}

function deriveMarketState(m: AutotradingMetrics | null): { level: MarketStateLevel; label: string } {
  if (!m) return { level: "unknown", label: "Unknown" };
  if (m.max_drawdown_pct > 25 || m.sharpe_ratio < 0)               return { level: "volatile",  label: "Volatile"  };
  if (m.sharpe_ratio > 1.2    && m.max_drawdown_pct < 15)           return { level: "trending",  label: "Trending"  };
  if (m.win_rate_pct  > 55    && m.sharpe_ratio > 0.5 && m.max_drawdown_pct < 20)
                                                                      return { level: "sideways",  label: "Sideways"  };
  return { level: "mixed", label: "Mixed" };
}

function deriveSignalProgress(
  m: AutotradingMetrics | null,
  minsAgo: number,
): { progress: SignalProgress; label: string; pct: number } {
  if (!m) return { progress: "none", label: "No data yet", pct: 0 };
  if (m.profit_factor < 1 || m.sharpe_ratio < 0)
    return { progress: "blocked", label: "Below entry threshold", pct: 0 };

  const conditions = [
    m.sharpe_ratio >= 0.3,
    m.profit_factor >= 1.1,
    m.win_rate_pct  >= 38,
    m.sharpe_ratio  >= 0.8,
    m.profit_factor >= 1.6,
    m.sharpe_ratio  >= 1.5,
    minsAgo < 30,
  ];
  const pct = Math.round(conditions.filter(Boolean).length / conditions.length * 100);

  if (pct >= 85) return { progress: "ready",   label: "Setup conditions met",       pct };
  if (pct >= 60) return { progress: "partial",  label: "Conditions partially met",   pct };
  return           { progress: "forming",  label: "Setup forming",              pct };
}

function deriveScanFrequency(interval: string): string {
  const map: Record<string, string> = {
    "1m":  "Every 1 minute",
    "3m":  "Every 3 minutes",
    "5m":  "Every 5 minutes",
    "15m": "Every 15 minutes",
    "30m": "Every 30 minutes",
    "1h":  "On each new 1-hour candle",
    "2h":  "On each new 2-hour candle",
    "4h":  "On each new 4-hour candle",
    "1d":  "Once per day at candle close",
    "3d":  "Every 3 days",
    "1w":  "Weekly at candle close",
  };
  return map[interval] ?? `On each ${interval} bar`;
}

function deriveNextActionTiming(
  progress: SignalProgress,
  marketState: MarketStateLevel,
  strategy: string,
): { timing: string; level: NextActionTimingLevel } {
  if (progress === "none")    return { timing: "No scan data yet",                          level: "none"    };
  if (progress === "blocked") return { timing: "No trade expected — below risk threshold",  level: "blocked" };

  // Strategy / market mismatch lowers probability
  const mismatch =
    (strategy.includes("Trend") && marketState === "sideways") ||
    (strategy.includes("Mean reversion") && marketState === "trending");

  if (progress === "ready") {
    if (mismatch) return { timing: "Trade possible — but market conditions unfavorable for strategy", level: "possible" };
    return { timing: "Next possible trade within 1–2 candles", level: "soon" };
  }
  if (progress === "partial") {
    if (mismatch) return { timing: "Low probability — market unfavorable and conditions incomplete",  level: "unlikely" };
    return { timing: "Trade possible within 3–5 candles if conditions improve",                       level: "possible" };
  }
  // forming
  if (mismatch) return { timing: "Low probability — market conditions unfavorable for strategy",     level: "unlikely" };
  return           { timing: "No immediate trade — setup still developing",                           level: "unlikely" };
}

function deriveConditionChecks(
  m: AutotradingMetrics | null,
  minsAgo: number,
): ConditionCheck[] {
  if (!m) {
    return [
      { label: "Performance data", detail: "No backtest results yet — run a session refresh", met: false },
    ];
  }

  const staleLabel = minsAgo === Infinity
    ? "Never scanned — run a backtest refresh"
    : minsAgo < 30
    ? `Scanned ${Math.round(minsAgo)}m ago — signals are current`
    : `Last scan ${Math.round(minsAgo)}m ago — signals may be stale`;

  return [
    {
      label: "Profitable edge",
      detail: m.profit_factor >= 1.1
        ? `Profit factor ${m.profit_factor.toFixed(2)} — strategy earns more than it loses`
        : `Profit factor ${m.profit_factor.toFixed(2)} — losses currently exceed gains`,
      met: m.profit_factor >= 1.1,
    },
    {
      label: "Signal strength",
      detail: m.sharpe_ratio >= 0.8
        ? `Sharpe ${m.sharpe_ratio.toFixed(2)} — strong risk-adjusted momentum`
        : m.sharpe_ratio >= 0.3
        ? `Sharpe ${m.sharpe_ratio.toFixed(2)} — marginal, needs improvement`
        : `Sharpe ${m.sharpe_ratio.toFixed(2)} — returns don't justify the volatility`,
      met: m.sharpe_ratio >= 0.3,
    },
    {
      label: "Win consistency",
      detail: m.win_rate_pct >= 38
        ? `${m.win_rate_pct.toFixed(0)}% win rate — acceptable trade frequency`
        : `${m.win_rate_pct.toFixed(0)}% win rate — fewer than 2 in 5 trades profit`,
      met: m.win_rate_pct >= 38,
    },
    {
      label: "Data freshness",
      detail: staleLabel,
      met: minsAgo < 30,
    },
  ];
}

function describeWatching(symbol: string, interval: string, strategy: string): string {
  const base = (() => {
    if (["1m","3m","5m"].includes(interval))
      return `Scanning ${symbol} every ${interval} for rapid momentum signals — tracking volume spikes and short-term price acceleration.`;
    if (["15m","30m"].includes(interval))
      return `Monitoring ${symbol} on ${interval} bars for intraday range breaks — evaluating breakout quality and rejection patterns.`;
    if (["1h","2h","4h"].includes(interval))
      return `Watching ${symbol} on ${interval} bars for swing entry setups — monitoring momentum continuation and pullback conditions.`;
    if (["1d","3d","1w"].includes(interval))
      return `Tracking ${symbol} on daily bars for trend-following entries — evaluating trend structure and pullback depth.`;
    return `Monitoring ${symbol} on ${interval} bars for technical entry conditions.`;
  })();

  const stratExtra = (() => {
    if (strategy === "Trend following")  return " Exits triggered on trend reversal signals.";
    if (strategy === "Mean reversion")   return " Looking for overextended moves to revert.";
    if (strategy === "Momentum")         return " Enters on breakouts, exits on momentum decay.";
    if (strategy === "Position trading") return " Holding periods span days to weeks.";
    return "";
  })();

  return base + stratExtra;
}

// ── Shadow mode ───────────────────────────────────────────────────────────────
// Computes the exact trade the system *would* place if live.
// No orders are placed — this is purely for display.

export interface ShadowSignal {
  direction:      "long" | "short";
  entryApprox:    number;
  stopLoss:       number;
  stopLossPct:    number;
  takeProfit:     number;
  takeProfitPct:  number;
  riskAmount:     number;
  positionSize:   number;
  riskReward:     number;
  confidence:     "low" | "medium" | "high";
  reason:         string;
  conditions:     string[];
}

export function computeShadowSignal(params: {
  symbol:         string;
  interval:       string;
  metrics:        AutotradingMetrics;
  initialCapital: number;
  maxCapitalPct:  number;
  lastPrice:      number;
}): ShadowSignal | null {
  const { symbol, interval, metrics, initialCapital, maxCapitalPct, lastPrice } = params;
  if (lastPrice <= 0) return null;
  if (metrics.profit_factor < 1 || metrics.sharpe_ratio < 0) return null;
  if (metrics.total_trades < 3) return null;

  // Stop-loss distance — based on timeframe and drawdown-derived volatility
  const baseSLMap: Record<string, number> = {
    "1m": 0.005, "3m": 0.006, "5m": 0.008,
    "15m": 0.010, "30m": 0.013,
    "1h": 0.016, "2h": 0.020, "4h": 0.024,
    "1d": 0.035, "3d": 0.050, "1w": 0.065,
  };
  const baseSL   = baseSLMap[interval] ?? 0.020;
  const ddFactor = 1 + Math.max(0, (metrics.max_drawdown_pct - 10) / 200);
  // Clamp: min 0.5% (avoids noise-stop-outs), max 10% (avoids catastrophic loss on a single trade)
  const slPct    = Math.min(Math.max(0.005, baseSL * ddFactor), 0.10);

  // Take-profit: risk:reward derived from profit factor, capped at 4:1
  const riskReward = Math.min(4, Math.max(1, metrics.profit_factor));
  const tpPct      = slPct * riskReward;

  // Position size: risk 1% of allocated capital per trade
  const allocatedCap = initialCapital * (maxCapitalPct / 100);
  const riskAmount   = allocatedCap * 0.01;
  const rawSize      = Math.floor(riskAmount / (lastPrice * slPct));
  // Reject signal if we can't even size 1 share — forcing 1 share would blow the risk model
  if (rawSize < 1) return null;
  const positionSize = rawSize;

  const confidence: "low" | "medium" | "high" =
    metrics.sharpe_ratio >= 1.5 && metrics.profit_factor >= 2.0 && metrics.win_rate_pct >= 55
      ? "high"
      : metrics.sharpe_ratio >= 0.8 && metrics.profit_factor >= 1.3
      ? "medium"
      : "low";

  const conditions: string[] = [
    `Profit factor ${metrics.profit_factor.toFixed(2)} — strategy earns more than it loses over ${metrics.total_trades} trades`,
    `Sharpe ratio ${metrics.sharpe_ratio.toFixed(2)} — risk-adjusted returns justify the entry`,
    `Win rate ${metrics.win_rate_pct.toFixed(0)}% — ${metrics.win_rate_pct >= 50 ? "majority of trades are profitable" : "sufficient for this strategy type"}`,
  ];
  if (metrics.max_drawdown_pct < 20) {
    conditions.push(`Max drawdown −${metrics.max_drawdown_pct.toFixed(1)}% — within acceptable risk range`);
  }

  return {
    direction:     "long",
    entryApprox:   lastPrice,
    stopLoss:      lastPrice * (1 - slPct),
    stopLossPct:   slPct * 100,
    takeProfit:    lastPrice * (1 + tpPct),
    takeProfitPct: tpPct * 100,
    riskAmount,
    positionSize,
    riskReward,
    confidence,
    reason: `${symbol} showing ${confidence === "high" ? "strong" : "developing"} ${interval} setup — all entry conditions met per strategy rules.`,
    conditions,
  };
}

/** Infer why a simulated trade closed from its P&L. */
export function inferTradeCloseReason(pnl: number, returnPct: number): string {
  if (pnl < 0) {
    if (returnPct < -3) return "Stop loss hit";
    return "Stop loss";
  }
  if (returnPct > 2.5)  return "Take profit hit";
  if (returnPct > 0.8)  return "Target reached";
  if (Math.abs(returnPct) < 0.15) return "Session ended";
  return "Signal reversed";
}

/** Estimate when the next scan will run based on interval and last refresh. */
export function estimateNextScan(interval: string, lastRefreshed: string | null): string | null {
  if (!lastRefreshed) return null;
  const msMap: Record<string, number> = {
    "1m": 60_000,       "3m": 180_000,      "5m": 300_000,
    "15m": 900_000,     "30m": 1_800_000,
    "1h": 3_600_000,    "2h": 7_200_000,    "4h": 14_400_000,
    "1d": 86_400_000,   "3d": 259_200_000,  "1w": 604_800_000,
  };
  const intervalMs = msMap[interval] ?? 3_600_000;
  const diff       = new Date(lastRefreshed).getTime() + intervalMs - Date.now();
  if (diff <= 0) return "due now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "< 1 min";
  if (mins < 60) return `~${mins} min`;
  return `~${Math.floor(mins / 60)}h`;
}

// ── Performance trend analysis ────────────────────────────────────────────────
// Analyzes recent trade history for deterioration, improvement, or volatility.
// Uses a rolling window approach: last-5 vs previous-5 trades.

export interface TradeSummary {
  pnl:       number;
  returnPct: number;
}

export interface PerformanceTrend {
  level:              "improving" | "declining" | "volatile" | "stable" | "insufficient";
  consecutiveLosses:  number;
  consecutiveWins:    number;
  recentWinRate:      number;     // win% of last 5 trades (0–100)
  overallWinRate:     number;     // win% of all provided trades (0–100)
  recentProfitFactor: number;     // gross profit / gross loss of last 5 trades
  deteriorating:      boolean;    // recentWinRate significantly below overallWinRate
  rallying:           boolean;    // recentWinRate significantly above overallWinRate
  insight:            string;     // human-readable one-liner
}

export function computePerformanceTrend(trades: TradeSummary[]): PerformanceTrend {
  const WINDOW = 5;

  if (trades.length < 3) {
    return {
      level: "insufficient",
      consecutiveLosses: 0,
      consecutiveWins: 0,
      recentWinRate: 0,
      overallWinRate: 0,
      recentProfitFactor: 1,
      deteriorating: false,
      rallying: false,
      insight: "Not enough trades to assess trend.",
    };
  }

  // Consecutive loss / win streak from the tail
  let consecutiveLosses = 0;
  let consecutiveWins   = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].pnl < 0) {
      if (consecutiveWins > 0) break;
      consecutiveLosses++;
    } else {
      if (consecutiveLosses > 0) break;
      consecutiveWins++;
    }
  }

  // Overall win rate
  const wins        = trades.filter(t => t.pnl > 0).length;
  const overallWinRate = (wins / trades.length) * 100;

  // Recent window (last WINDOW trades)
  const recent      = trades.slice(-WINDOW);
  const recentWins  = recent.filter(t => t.pnl > 0).length;
  const recentWinRate = (recentWins / recent.length) * 100;

  // Recent profit factor
  const recentGross = recent.reduce((s, t) => s + Math.max(0, t.pnl), 0);
  const recentLoss  = recent.reduce((s, t) => s + Math.abs(Math.min(0, t.pnl)), 0);
  const recentProfitFactor = recentLoss > 0 ? recentGross / recentLoss : recentGross > 0 ? 4 : 1;

  // Volatility: std dev of recent returns relative to mean
  const avgRet  = recent.reduce((s, t) => s + Math.abs(t.returnPct), 0) / recent.length;
  const variance = recent.reduce((s, t) => s + Math.pow(Math.abs(t.returnPct) - avgRet, 2), 0) / recent.length;
  const stdDev  = Math.sqrt(variance);
  const isHighVol = avgRet > 0 && (stdDev / avgRet) > 1.5;

  const deteriorating = trades.length >= WINDOW && (recentWinRate < overallWinRate - 20);
  const rallying      = trades.length >= WINDOW && (recentWinRate > overallWinRate + 20);

  // Determine level
  let level: PerformanceTrend["level"];
  let insight: string;

  if (consecutiveLosses >= 4) {
    level = "declining";
    insight = `${consecutiveLosses} consecutive losing trades — strategy in active drawdown streak.`;
  } else if (deteriorating && recentWinRate < 35) {
    level = "declining";
    insight = `Recent win rate ${recentWinRate.toFixed(0)}% vs ${overallWinRate.toFixed(0)}% historical — performance degrading.`;
  } else if (isHighVol && avgRet > 2) {
    level = "volatile";
    insight = `High return variance (σ ${stdDev.toFixed(1)}%) — strategy producing inconsistent outcomes.`;
  } else if (rallying && recentWinRate >= 60) {
    level = "improving";
    insight = `Recent win rate ${recentWinRate.toFixed(0)}% — momentum building above historical ${overallWinRate.toFixed(0)}%.`;
  } else if (consecutiveWins >= 3 && recentProfitFactor > 1.5) {
    level = "improving";
    insight = `${consecutiveWins} consecutive wins with profit factor ${recentProfitFactor.toFixed(2)} — strategy in positive phase.`;
  } else if (deteriorating) {
    level = "volatile";
    insight = `Recent win rate ${recentWinRate.toFixed(0)}% slipping from historical ${overallWinRate.toFixed(0)}% — watch closely.`;
  } else {
    level = "stable";
    insight = `Win rate ${recentWinRate.toFixed(0)}% in line with historical ${overallWinRate.toFixed(0)}% — no significant drift.`;
  }

  return {
    level,
    consecutiveLosses,
    consecutiveWins,
    recentWinRate,
    overallWinRate,
    recentProfitFactor,
    deteriorating,
    rallying,
    insight,
  };
}

// ── Equity curve volatility ───────────────────────────────────────────────────
// Derives a session-level volatility reading from the equity curve.
// Used to flag unusually choppy equity — a signal the strategy is struggling.

export type EquityVolatility = "low" | "medium" | "high" | null;

export function computeEquityVolatility(
  curve: { equity: number }[],
): EquityVolatility {
  if (curve.length < 6) return null;
  const pts = curve.slice(-10);
  const returns: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i - 1].equity > 0) {
      returns.push((pts[i].equity - pts[i - 1].equity) / pts[i - 1].equity);
    }
  }
  if (returns.length < 3) return null;
  const avgAbs = returns.reduce((s, r) => s + Math.abs(r), 0) / returns.length;
  if (avgAbs > 0.04) return "high";
  if (avgAbs > 0.015) return "medium";
  return "low";
}

export function computeLiveState(params: {
  status: string;
  autoEnabled: boolean;
  pauseReason: string | null;
  symbol: string;
  interval: string;
  lastRefreshed: string | null;
  metrics: AutotradingMetrics | null;
}): LiveState {
  const { status, autoEnabled, pauseReason, symbol, interval, lastRefreshed, metrics } = params;
  const tfLabel   = timeframeLabel(interval);
  const strategy  = deriveStrategy(interval, metrics);
  const mktState  = deriveMarketState(metrics);
  const scanFreq  = deriveScanFrequency(interval);

  const inactiveChecks = deriveConditionChecks(metrics, Infinity);

  // ── Terminal / inactive states ────────────────────────────────────────────

  if (status === "stopped") {
    return {
      level: "stopped", currentState: "Session permanently stopped",
      watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
      watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
      watchingDetail: "This session was terminated via kill switch. No further monitoring or trades.",
      scanFrequency: scanFreq,
      nextAction: "No trade expected", nextActionTrigger: "Create a new session to continue trading.",
      nextActionTiming: "No trade expected", nextActionTimingLevel: "none",
      signalProgress: "none", signalProgressLabel: "Stopped", signalProgressPct: 0,
      conditionChecks: inactiveChecks,
    };
  }

  if (status === "paused") {
    const reason = pauseReason ?? "Manually paused";
    return {
      level: "paused", currentState: reason,
      watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
      watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
      watchingDetail: `${symbol} on ${tfLabel} — signal scanning suspended. ${reason}. Resume to restart monitoring.`,
      scanFrequency: scanFreq,
      nextAction: "No trade until resumed", nextActionTrigger: "Review the pause reason and resume manually.",
      nextActionTiming: "No trade until manually resumed", nextActionTimingLevel: "none",
      signalProgress: "none", signalProgressLabel: "Paused", signalProgressPct: 0,
      conditionChecks: inactiveChecks,
    };
  }

  if (!autoEnabled) {
    return {
      level: "off", currentState: "Signal monitoring is off",
      watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
      watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
      watchingDetail: `${symbol} on ${tfLabel} is configured but not actively scanned. Enable autotrading to start monitoring.`,
      scanFrequency: scanFreq,
      nextAction: "No trade expected", nextActionTrigger: "Enable autotrading to activate signal scanning.",
      nextActionTiming: "No trade expected", nextActionTimingLevel: "none",
      signalProgress: "none", signalProgressLabel: "Off", signalProgressPct: 0,
      conditionChecks: inactiveChecks,
    };
  }

  // ── Active + autotrading on ───────────────────────────────────────────────

  const minsAgo = lastRefreshed
    ? (Date.now() - new Date(lastRefreshed).getTime()) / 60_000
    : Infinity;

  const sig     = deriveSignalProgress(metrics, minsAgo);
  const timing  = deriveNextActionTiming(sig.progress, mktState.level, strategy);
  const checks  = deriveConditionChecks(metrics, minsAgo);

  // Current state — descriptive
  let currentState: string;
  let level: LiveStateLevel;

  if (minsAgo < 3) {
    level = "scanning";
    currentState = `Analyzing ${tfLabel} for ${strategy.toLowerCase()} signal`;
  } else if (sig.progress === "ready") {
    level = "active";
    currentState = `Setup conditions met — waiting for entry trigger`;
  } else if (sig.progress === "partial") {
    level = "active";
    currentState = `Monitoring ${symbol} — setup partially formed`;
  } else if (sig.progress === "blocked") {
    level = "active";
    currentState = `Watching ${symbol} — strategy below entry threshold`;
  } else if (minsAgo < 60) {
    level = "active";
    currentState = `Scanning ${symbol} — no valid signal on last check`;
  } else {
    level = "waiting";
    currentState = `Idle — waiting for next refresh cycle`;
  }

  // Next action + trigger
  let nextAction: string;
  let nextActionTrigger: string;

  if (!metrics) {
    nextAction = "No signal data yet";
    nextActionTrigger = "Run a backtest refresh to initialize signal monitoring.";
  } else if (sig.progress === "blocked") {
    nextAction = "No entry expected";
    nextActionTrigger = "Strategy metrics below minimum threshold — review the analysis section.";
  } else if (sig.progress === "ready") {
    nextAction = strategy.includes("Trend") || strategy.includes("Position")
      ? `Enter ${symbol} on trend continuation if signal confirms`
      : `Enter ${symbol} on breakout if setup triggers`;
    nextActionTrigger = "All setup conditions met — awaiting final price action confirmation.";
  } else if (sig.progress === "partial") {
    nextAction = "Wait for confirmation";
    nextActionTrigger = `${100 - sig.pct}% of conditions still unmet — monitoring for improvement.`;
  } else {
    nextAction = "Watch for setup to develop";
    nextActionTrigger = "Conditions are forming but not yet strong enough for an entry.";
  }

  return {
    level, currentState,
    watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
    watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
    watchingDetail: describeWatching(symbol, interval, strategy),
    scanFrequency: scanFreq,
    nextAction, nextActionTrigger,
    nextActionTiming: timing.timing, nextActionTimingLevel: timing.level,
    signalProgress: sig.progress, signalProgressLabel: sig.label, signalProgressPct: sig.pct,
    conditionChecks: checks,
  };
}
