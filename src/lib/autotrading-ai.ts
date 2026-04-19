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

export function generateAutotradingRecommendations(
  metrics: AutotradingMetrics,
  safety: SafetySnapshot,
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

export type LiveStateLevel   = "scanning" | "active" | "waiting" | "paused" | "stopped" | "off";
export type MarketStateLevel = "trending" | "sideways" | "volatile" | "mixed" | "unknown";
export type SignalProgress   = "none" | "forming" | "partial" | "ready" | "blocked";

export interface LiveState {
  level: LiveStateLevel;
  currentState: string;        // "Analyzing 1h bars for breakout setup"

  // Watching breakdown
  watchSymbol: string;
  watchTimeframe: string;      // "1-hour bars"
  watchStrategy: string;       // "Trend following", "Mean reversion", etc.
  watchMarketState: MarketStateLevel;
  watchMarketStateLabel: string;
  watchingDetail: string;      // paragraph for detail page

  // Next action
  nextAction: string;          // "Enter on next breakout if conditions align"
  nextActionTrigger: string;   // "Requires: signal strength above threshold and recent scan"

  // Signal progress
  signalProgress: SignalProgress;
  signalProgressLabel: string; // "Setup forming", "Conditions partially met", etc.
  signalProgressPct: number;   // 0–100
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
  const tfLabel  = timeframeLabel(interval);
  const strategy = deriveStrategy(interval, metrics);
  const mktState = deriveMarketState(metrics);

  // ── Terminal / inactive states ────────────────────────────────────────────

  if (status === "stopped") {
    return {
      level: "stopped", currentState: "Session permanently stopped",
      watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
      watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
      watchingDetail: "This session was terminated via kill switch. No further monitoring or trades.",
      nextAction: "No trade expected", nextActionTrigger: "Create a new session to continue trading.",
      signalProgress: "none", signalProgressLabel: "Stopped", signalProgressPct: 0,
    };
  }

  if (status === "paused") {
    const reason = pauseReason ?? "Manually paused";
    return {
      level: "paused", currentState: reason,
      watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
      watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
      watchingDetail: `${symbol} on ${tfLabel} — signal scanning suspended. ${reason}. Resume the session to restart monitoring.`,
      nextAction: "No trade until resumed", nextActionTrigger: "Review the pause reason and resume manually.",
      signalProgress: "none", signalProgressLabel: "Paused", signalProgressPct: 0,
    };
  }

  if (!autoEnabled) {
    return {
      level: "off", currentState: "Signal monitoring is off",
      watchSymbol: symbol, watchTimeframe: tfLabel, watchStrategy: strategy,
      watchMarketState: mktState.level, watchMarketStateLabel: mktState.label,
      watchingDetail: `${symbol} on ${tfLabel} is configured but not actively scanned. Enable autotrading to start monitoring.`,
      nextAction: "No trade expected", nextActionTrigger: "Enable autotrading to activate signal scanning.",
      signalProgress: "none", signalProgressLabel: "Off", signalProgressPct: 0,
    };
  }

  // ── Active + autotrading on ───────────────────────────────────────────────

  const minsAgo = lastRefreshed
    ? (Date.now() - new Date(lastRefreshed).getTime()) / 60_000
    : Infinity;

  const sig = deriveSignalProgress(metrics, minsAgo);

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
    nextAction, nextActionTrigger,
    signalProgress: sig.progress, signalProgressLabel: sig.label, signalProgressPct: sig.pct,
  };
}
