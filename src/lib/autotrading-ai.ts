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
// Derives what the session is doing *right now* from available state.
// No LLM — pure derivation from status + metrics + timing.

export type LiveStateLevel = "scanning" | "active" | "waiting" | "paused" | "stopped" | "off";

export interface LiveState {
  level: LiveStateLevel;
  /** Short phrase: "Scanning BTC", "Waiting for next refresh" */
  currentState: string;
  /** What the system is monitoring: symbol, interval, strategy type */
  watching: string;
  /** Expanded watching description for detail views */
  watchingDetail: string;
  /** What will happen next */
  nextAction: string;
}

function strategyHint(interval: string): string {
  if (["1m", "3m", "5m"].includes(interval)) return "scalp & momentum";
  if (["15m", "30m"].includes(interval))      return "intraday breakout";
  if (["1h", "2h", "4h"].includes(interval))  return "swing momentum";
  if (["1d", "3d", "1w"].includes(interval))  return "trend following";
  return "technical signals";
}

function watchingDetailText(symbol: string, interval: string): string {
  if (["1m", "3m", "5m"].includes(interval))
    return `Scanning ${symbol} for short-term momentum — rapid price action and volume spikes on each ${interval} bar.`;
  if (["15m", "30m"].includes(interval))
    return `Monitoring ${symbol} for intraday breakouts — range expansions with confirmation on the ${interval} chart.`;
  if (["1h", "2h", "4h"].includes(interval))
    return `Watching ${symbol} for swing entries — momentum continuation and pullback setups on the ${interval} timeframe.`;
  if (["1d", "3d", "1w"].includes(interval))
    return `Tracking ${symbol} trend — position entries on pullbacks within the established trend direction on daily bars.`;
  return `Monitoring ${symbol} on ${interval} bars for technical entry and exit conditions.`;
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

  if (status === "stopped") {
    return {
      level: "stopped",
      currentState: "Session stopped",
      watching: "—",
      watchingDetail: "This session has been permanently terminated via kill switch.",
      nextAction: "Create a new session to continue trading",
    };
  }

  if (status === "paused") {
    return {
      level: "paused",
      currentState: pauseReason ?? "Paused",
      watching: `${symbol} · ${interval}`,
      watchingDetail: `${symbol} on ${interval} — not scanning. Session is paused${pauseReason ? `: ${pauseReason.toLowerCase()}` : ""}.`,
      nextAction: "No trade until session is manually resumed",
    };
  }

  if (!autoEnabled) {
    return {
      level: "off",
      currentState: "Not monitoring",
      watching: `${symbol} · ${interval}`,
      watchingDetail: `${symbol} on ${interval} is not being scanned. Enable autotrading to activate signal monitoring.`,
      nextAction: "Enable autotrading to activate signal scanning",
    };
  }

  // Active + autotrading on
  const minsAgo = lastRefreshed
    ? (Date.now() - new Date(lastRefreshed).getTime()) / 60_000
    : Infinity;

  const hint    = strategyHint(interval);
  const watching = `${symbol} · ${interval} · ${hint}`;
  const watchingDetail = watchingDetailText(symbol, interval);

  let currentState: string;
  let level: LiveStateLevel;
  if (minsAgo < 3) {
    currentState = `Scanning ${symbol}`;
    level = "scanning";
  } else if (minsAgo < 60) {
    currentState = `Active — ${Math.round(minsAgo)}m since last scan`;
    level = "active";
  } else {
    currentState = "Waiting for next refresh";
    level = "waiting";
  }

  let nextAction: string;
  if (!metrics) {
    nextAction = "Run a backtest refresh to initialize monitoring";
  } else if (metrics.profit_factor < 1 || metrics.sharpe_ratio < 0) {
    nextAction = "Holding — strategy performance below entry threshold";
  } else if (metrics.sharpe_ratio >= 1.5 && metrics.profit_factor >= 1.5) {
    nextAction = hint.includes("trend")
      ? `Enter ${symbol} on next trend pullback if signal confirms`
      : `Enter on next breakout if volume and momentum confirm`;
  } else {
    nextAction = "Wait for confirmation before entry";
  }

  return { level, currentState, watching, watchingDetail, nextAction };
}
