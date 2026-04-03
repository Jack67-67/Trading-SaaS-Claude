import type { BacktestMetrics } from "@/types";

export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type TimeframeHorizon = "short" | "medium" | "long";

export interface GeneratedStrategy {
  name: string;
  description: string;
  code: string;
  interval: string;
  entry: Record<string, unknown>;
  risk: Record<string, unknown>;
  params: Record<string, unknown>;
}

export interface AiInsight {
  type: "positive" | "neutral" | "warning";
  title: string;
  text: string;
}

// ── Strategy templates ─────────────────────────────────────────────────────

const TEMPLATES: Record<RiskLevel, Record<TimeframeHorizon, GeneratedStrategy>> = {
  conservative: {
    short: {
      name: "SMA Crossover (20/50)",
      description:
        "A conservative short-term strategy using a 20/50-period SMA crossover. Trades only in the direction of the prevailing trend to filter out noise and reduce false signals.",
      interval: "4h",
      entry: { signal: "sma_crossover", fast: 20, slow: 50 },
      risk: { stop_loss_pct: 2, take_profit_pct: 6, max_position_pct: 50 },
      params: { fast_period: 20, slow_period: 50 },
      code: `"""
SMA Crossover Strategy (20/50)
Conservative | Short-term
"""

class Strategy:
    def __init__(self, params):
        self.fast_period = params.get("fast_period", 20)
        self.slow_period = params.get("slow_period", 50)
        self.prices = []

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])
        if len(self.prices) < self.slow_period:
            return

        fast_sma = sum(self.prices[-self.fast_period:]) / self.fast_period
        slow_sma = sum(self.prices[-self.slow_period:]) / self.slow_period
        position = portfolio.get_position(bar["symbol"])

        if fast_sma > slow_sma and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.5)
        elif fast_sma < slow_sma and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
    medium: {
      name: "SMA Crossover (50/100)",
      description:
        "A medium-term trend-following strategy using 50/100-period SMAs. Captures sustained directional moves while filtering out short-term noise on daily charts.",
      interval: "1d",
      entry: { signal: "sma_crossover", fast: 50, slow: 100 },
      risk: { stop_loss_pct: 3, take_profit_pct: 9, max_position_pct: 60 },
      params: { fast_period: 50, slow_period: 100 },
      code: `"""
SMA Crossover Strategy (50/100)
Conservative | Medium-term
"""

class Strategy:
    def __init__(self, params):
        self.fast_period = params.get("fast_period", 50)
        self.slow_period = params.get("slow_period", 100)
        self.prices = []

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])
        if len(self.prices) < self.slow_period:
            return

        fast_sma = sum(self.prices[-self.fast_period:]) / self.fast_period
        slow_sma = sum(self.prices[-self.slow_period:]) / self.slow_period
        position = portfolio.get_position(bar["symbol"])

        if fast_sma > slow_sma and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.6)
        elif fast_sma < slow_sma and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
    long: {
      name: "Golden Cross (50/200)",
      description:
        "The classic Golden Cross strategy. Enters long when the 50-period SMA crosses above the 200-period SMA. Historically reliable for catching major bull markets with minimal whipsaws.",
      interval: "1d",
      entry: { signal: "golden_cross", fast: 50, slow: 200 },
      risk: { stop_loss_pct: 5, take_profit_pct: 20, max_position_pct: 70 },
      params: { fast_period: 50, slow_period: 200 },
      code: `"""
Golden Cross Strategy (50/200)
Conservative | Long-term
"""

class Strategy:
    def __init__(self, params):
        self.fast_period = params.get("fast_period", 50)
        self.slow_period = params.get("slow_period", 200)
        self.prices = []

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])
        if len(self.prices) < self.slow_period:
            return

        fast_sma = sum(self.prices[-self.fast_period:]) / self.fast_period
        slow_sma = sum(self.prices[-self.slow_period:]) / self.slow_period
        prev_fast = sum(self.prices[-self.fast_period-1:-1]) / self.fast_period
        prev_slow = sum(self.prices[-self.slow_period-1:-1]) / self.slow_period
        position = portfolio.get_position(bar["symbol"])

        # Golden Cross
        if prev_fast <= prev_slow and fast_sma > slow_sma and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.7)
        # Death Cross
        elif prev_fast >= prev_slow and fast_sma < slow_sma and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
  },

  balanced: {
    short: {
      name: "MACD Crossover",
      description:
        "Uses the MACD line and signal line crossover to time entries and exits. Balances trend-following with momentum detection for medium-frequency intraday trading.",
      interval: "4h",
      entry: { signal: "macd_crossover", fast: 12, slow: 26, signal_period: 9 },
      risk: { stop_loss_pct: 2.5, take_profit_pct: 7, max_position_pct: 70 },
      params: { fast_period: 12, slow_period: 26, signal_period: 9 },
      code: `"""
MACD Crossover Strategy
Balanced | Short-term
"""

class Strategy:
    def __init__(self, params):
        self.fast = params.get("fast_period", 12)
        self.slow = params.get("slow_period", 26)
        self.signal_period = params.get("signal_period", 9)
        self.prices = []
        self.ema_fast = None
        self.ema_slow = None
        self.signal_line = None

    def _ema(self, prev, price, period):
        k = 2 / (period + 1)
        return price * k + prev * (1 - k) if prev else price

    def on_bar(self, bar, portfolio):
        price = bar["close"]
        self.ema_fast = self._ema(self.ema_fast, price, self.fast)
        self.ema_slow = self._ema(self.ema_slow, price, self.slow)
        if self.ema_fast is None or self.ema_slow is None:
            return

        macd = self.ema_fast - self.ema_slow
        self.signal_line = self._ema(self.signal_line, macd, self.signal_period)
        if self.signal_line is None:
            return

        position = portfolio.get_position(bar["symbol"])
        if macd > self.signal_line and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.7)
        elif macd < self.signal_line and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
    medium: {
      name: "RSI Mean Reversion",
      description:
        "Buys oversold conditions (RSI < 30) and exits overbought conditions (RSI > 70). Well-suited for ranging and oscillating markets with mean-reverting price behavior.",
      interval: "1d",
      entry: { signal: "rsi_reversion", oversold: 30, overbought: 70 },
      risk: { stop_loss_pct: 3, take_profit_pct: 8, max_position_pct: 75 },
      params: { rsi_period: 14, oversold_threshold: 30, overbought_threshold: 70 },
      code: `"""
RSI Mean Reversion Strategy
Balanced | Medium-term
"""

class Strategy:
    def __init__(self, params):
        self.period = params.get("rsi_period", 14)
        self.oversold = params.get("oversold_threshold", 30)
        self.overbought = params.get("overbought_threshold", 70)
        self.prices = []
        self.avg_gain = None
        self.avg_loss = None

    def _rsi(self):
        if len(self.prices) < self.period + 1:
            return None
        deltas = [self.prices[i] - self.prices[i-1] for i in range(-self.period, 0)]
        gains = [d for d in deltas if d > 0]
        losses = [-d for d in deltas if d < 0]
        avg_gain = sum(gains) / self.period
        avg_loss = sum(losses) / self.period
        if avg_loss == 0:
            return 100
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])
        rsi = self._rsi()
        if rsi is None:
            return

        position = portfolio.get_position(bar["symbol"])
        if rsi < self.oversold and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.75)
        elif rsi > self.overbought and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
    long: {
      name: "Triple EMA Trend",
      description:
        "Systematic long-term trend following using triple EMA alignment (12/26/52). Enters when all three EMAs are stacked bullishly and exits on trend reversal.",
      interval: "1w",
      entry: { signal: "ema_trend", fast: 12, medium: 26, slow: 52 },
      risk: { stop_loss_pct: 8, take_profit_pct: 30, max_position_pct: 80 },
      params: { fast_ema: 12, medium_ema: 26, slow_ema: 52 },
      code: `"""
Triple EMA Trend Strategy
Balanced | Long-term
"""

class Strategy:
    def __init__(self, params):
        self.fast_period  = params.get("fast_ema", 12)
        self.mid_period   = params.get("medium_ema", 26)
        self.slow_period  = params.get("slow_ema", 52)
        self.fast = self.mid = self.slow = None

    def _ema(self, prev, price, period):
        k = 2 / (period + 1)
        return price * k + prev * (1 - k) if prev else price

    def on_bar(self, bar, portfolio):
        price = bar["close"]
        self.fast = self._ema(self.fast, price, self.fast_period)
        self.mid  = self._ema(self.mid,  price, self.mid_period)
        self.slow = self._ema(self.slow, price, self.slow_period)
        if None in (self.fast, self.mid, self.slow):
            return

        position = portfolio.get_position(bar["symbol"])
        bull = self.fast > self.mid > self.slow
        bear = self.fast < self.mid < self.slow

        if bull and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.8)
        elif bear and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
  },

  aggressive: {
    short: {
      name: "Bollinger Band Breakout",
      description:
        "Trades price breakouts beyond the upper Bollinger Band. Designed for highly volatile assets — enters on momentum expansion and exits on band contraction.",
      interval: "1h",
      entry: { signal: "bb_breakout", period: 20, std_dev: 2.0 },
      risk: { stop_loss_pct: 3, take_profit_pct: 9, max_position_pct: 90 },
      params: { bb_period: 20, std_dev_multiplier: 2.0 },
      code: `"""
Bollinger Band Breakout Strategy
Aggressive | Short-term
"""
import statistics

class Strategy:
    def __init__(self, params):
        self.period = params.get("bb_period", 20)
        self.std_mult = params.get("std_dev_multiplier", 2.0)
        self.prices = []

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])
        if len(self.prices) < self.period:
            return

        window = self.prices[-self.period:]
        mid = sum(window) / self.period
        std = statistics.stdev(window)
        upper = mid + self.std_mult * std
        lower = mid - self.std_mult * std

        price = bar["close"]
        position = portfolio.get_position(bar["symbol"])

        if price > upper and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 0.9)
        elif price < mid and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
    medium: {
      name: "Momentum (ROC)",
      description:
        "Enters in the direction of strong recent momentum measured by rate of change (ROC). Designed to capture explosive directional moves with high position sizing.",
      interval: "1d",
      entry: { signal: "momentum_roc", period: 14, threshold: 5 },
      risk: { stop_loss_pct: 4, take_profit_pct: 15, max_position_pct: 100 },
      params: { roc_period: 14, momentum_threshold: 5 },
      code: `"""
Momentum Strategy (Rate of Change)
Aggressive | Medium-term
"""

class Strategy:
    def __init__(self, params):
        self.period = params.get("roc_period", 14)
        self.threshold = params.get("momentum_threshold", 5.0)
        self.prices = []

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])
        if len(self.prices) <= self.period:
            return

        roc = (self.prices[-1] / self.prices[-self.period - 1] - 1) * 100
        position = portfolio.get_position(bar["symbol"])

        if roc > self.threshold and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 1.0)
        elif roc < -self.threshold and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
    long: {
      name: "Volatility Breakout (ATR)",
      description:
        "Detects volatility expansion after periods of compression using ATR. Enters on breakout moves larger than 1.5× the average true range for high-conviction signals.",
      interval: "1d",
      entry: { signal: "atr_breakout", atr_period: 14, breakout_multiplier: 1.5 },
      risk: { stop_loss_pct: 6, take_profit_pct: 24, max_position_pct: 100 },
      params: { atr_period: 14, breakout_multiplier: 1.5 },
      code: `"""
Volatility Breakout Strategy (ATR)
Aggressive | Long-term
"""

class Strategy:
    def __init__(self, params):
        self.period = params.get("atr_period", 14)
        self.mult = params.get("breakout_multiplier", 1.5)
        self.bars = []

    def _atr(self):
        if len(self.bars) < self.period + 1:
            return None
        trs = []
        for i in range(-self.period, 0):
            h, l, pc = self.bars[i]["high"], self.bars[i]["low"], self.bars[i-1]["close"]
            trs.append(max(h - l, abs(h - pc), abs(l - pc)))
        return sum(trs) / self.period

    def on_bar(self, bar, portfolio):
        self.bars.append(bar)
        atr = self._atr()
        if atr is None or len(self.bars) < 2:
            return

        move = bar["close"] - self.bars[-2]["close"]
        position = portfolio.get_position(bar["symbol"])

        if move > atr * self.mult and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 1.0)
        elif move < -atr * self.mult and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
    },
  },
};

export function generateStrategy(
  risk: RiskLevel,
  timeframe: TimeframeHorizon,
): GeneratedStrategy {
  return TEMPLATES[risk][timeframe];
}

// ── Confidence signal ──────────────────────────────────────────────────────

export type ConfidenceLevel = "good" | "neutral" | "risky";

export interface ConfidenceSignal {
  level: ConfidenceLevel;
  label: string;
  score: number; // 0–100
  reason: string;
}

export function computeConfidence(metrics: BacktestMetrics): ConfidenceSignal {
  let score = 50;

  // Sharpe ratio (±35 pts)
  const sharpe = metrics.sharpe_ratio;
  if (sharpe >= 2)        score += 35;
  else if (sharpe >= 1.5) score += 25;
  else if (sharpe >= 1)   score += 12;
  else if (sharpe >= 0.5) score += 0;
  else                    score -= 20;

  // Max drawdown (±25 pts)
  const dd = Math.abs(metrics.max_drawdown_pct);
  if (dd <= 10)      score += 25;
  else if (dd <= 20) score += 10;
  else if (dd <= 35) score += 0;
  else               score -= 15;

  // Win rate (±15 pts)
  const wr = metrics.win_rate_pct;
  if (wr >= 60)      score += 15;
  else if (wr >= 50) score += 5;
  else               score -= 5;

  // Profit factor (±15 pts)
  const pf = metrics.profit_factor;
  if (pf >= 2)        score += 15;
  else if (pf >= 1.5) score += 8;
  else if (pf >= 1.2) score += 3;
  else                score -= 10;

  // Trade count (±10 pts)
  const trades = metrics.total_trades;
  if (trades >= 30)      score += 10;
  else if (trades >= 15) score += 5;
  else                   score -= 5;

  score = Math.max(0, Math.min(100, score));

  // Primary reason (most impactful factor)
  let reason: string;
  if (sharpe < 0.5)
    reason = "Sharpe ratio is too low to justify the risk taken.";
  else if (dd > 35)
    reason = "Max drawdown is exceptionally high — live trading risk is elevated.";
  else if (pf < 1.2)
    reason = "Profit factor is near breakeven — edge may not be statistically reliable.";
  else if (trades < 15)
    reason = "Too few trades to draw statistical conclusions with confidence.";
  else if (sharpe >= 1.5 && dd <= 20 && wr >= 50)
    reason = "Strong Sharpe, controlled drawdown, and consistent win rate.";
  else if (sharpe >= 1)
    reason = "Acceptable risk-adjusted returns with manageable drawdown.";
  else
    reason = "Mixed signals — returns are moderate but risk factors need attention.";

  const level: ConfidenceLevel =
    score >= 65 ? "good" : score >= 40 ? "neutral" : "risky";

  return {
    level,
    label: level === "good" ? "Good" : level === "neutral" ? "Neutral" : "Risky",
    score,
    reason,
  };
}

// ── AI Summary ─────────────────────────────────────────────────────────────

export function generateSummary(
  metrics: BacktestMetrics,
  opts?: { risk?: RiskLevel; timeframe?: TimeframeHorizon; symbol?: string },
): string {
  const ret = metrics.total_return_pct;
  const sharpe = metrics.sharpe_ratio;
  const dd = Math.abs(metrics.max_drawdown_pct);
  const wr = metrics.win_rate_pct;
  const pf = metrics.profit_factor;
  const { symbol, risk, timeframe } = opts ?? {};

  const parts: string[] = [];

  // Opening: overall result tone
  if (ret >= 20 && sharpe >= 1.5) {
    parts.push(
      `This strategy delivered strong results${symbol ? ` on ${symbol}` : ""} — ${ret.toFixed(1)}% total return with an excellent Sharpe of ${sharpe.toFixed(2)}.`,
    );
  } else if (ret >= 10 && sharpe >= 1) {
    parts.push(
      `The strategy achieved solid performance${symbol ? ` on ${symbol}` : ""}, returning ${ret.toFixed(1)}% with acceptable risk-adjusted returns.`,
    );
  } else if (ret >= 0) {
    parts.push(
      `The strategy was marginally profitable${symbol ? ` on ${symbol}` : ""}, returning ${ret.toFixed(1)}%, though the risk-adjusted picture is mixed.`,
    );
  } else {
    parts.push(
      `This strategy was unprofitable${symbol ? ` on ${symbol}` : ""}, losing ${Math.abs(ret).toFixed(1)}% over the test period.`,
    );
  }

  // Middle: standout risk/reward factor
  if (dd > 30) {
    parts.push(
      `However, a ${dd.toFixed(1)}% max drawdown is significant — the strategy carries real downside risk in adverse conditions.`,
    );
  } else if (dd <= 15 && ret > 0) {
    parts.push(
      `Drawdown was well-controlled at ${dd.toFixed(1)}%, suggesting the risk management rules are working as intended.`,
    );
  }

  // Closer: behavioral observation
  if (wr < 45 && pf > 1.3) {
    parts.push(
      `The edge comes from letting winners run — a low win rate is expected for this style, but individual wins are disproportionately large.`,
    );
  } else if (wr >= 55 && pf < 1.3) {
    parts.push(
      `While the win rate is high, average wins are small relative to losses. Widening profit targets could improve the profit factor.`,
    );
  } else if (risk === "aggressive" && dd > 25) {
    parts.push(
      `The drawdown is typical for an aggressive profile — position sizing is the primary lever for controlling live trading risk.`,
    );
  } else if (timeframe === "long" && metrics.total_trades < 20) {
    parts.push(
      `Long-term strategies generate fewer signals by design; a longer test window would further strengthen statistical confidence.`,
    );
  }

  return parts.join(" ");
}

// ── AI Recommendations ─────────────────────────────────────────────────────

export function generateRecommendations(
  metrics: BacktestMetrics,
  risk?: RiskLevel,
  timeframe?: TimeframeHorizon,
): string[] {
  const recs: string[] = [];
  const dd = Math.abs(metrics.max_drawdown_pct);
  const sharpe = metrics.sharpe_ratio;
  const wr = metrics.win_rate_pct;
  const pf = metrics.profit_factor;
  const trades = metrics.total_trades;

  // 1. Position / risk sizing
  if (dd > 30) {
    recs.push(
      "Reduce position size by 30–50% to bring max drawdown into a safer range before trading live.",
    );
  } else if (sharpe < 0.8 && metrics.total_return_pct > 0) {
    recs.push(
      "Tighten stop-loss levels to improve risk/reward and lift the Sharpe ratio above 1.0.",
    );
  } else if (risk === "aggressive" && sharpe < 1) {
    recs.push(
      "Consider switching to a balanced risk profile — the aggressive sizing is not generating proportional returns.",
    );
  } else {
    recs.push(
      "Position sizing is appropriate for this risk profile. Monitor live drawdown and reduce exposure if it exceeds backtest levels.",
    );
  }

  // 2. Signal quality
  if (wr < 45 && pf < 1.2) {
    recs.push(
      "Both win rate and profit factor are weak. Adding a trend filter (e.g. only trade in the direction of the 200-day SMA) could significantly improve signal quality.",
    );
  } else if (wr >= 60 && pf < 1.5) {
    recs.push(
      "Increase profit targets by 20–30% to let winners run longer — the high win rate suggests you're exiting profitable trades too early.",
    );
  } else if (trades < 15) {
    recs.push(
      "Extend the backtest period or use a shorter interval to generate more trades and improve statistical significance.",
    );
  } else if (timeframe === "short" && sharpe >= 1.5) {
    recs.push(
      "Performance is strong on the short timeframe. Paper trade for 2–4 weeks to validate edge before committing real capital.",
    );
  } else {
    recs.push(
      `${timeframe === "long" ? "Test this strategy on a medium-term interval" : "Run this strategy on 2–3 additional symbols"} to verify the edge generalizes beyond this single test.`,
    );
  }

  // 3. Validation / next step
  if (sharpe >= 1.5 && dd <= 20) {
    recs.push(
      "Results look promising. Run an out-of-sample validation on a separate date range to check for overfitting before going live.",
    );
  } else if (metrics.total_return_pct < 0) {
    recs.push(
      "Review the entry conditions — the current signal logic may be generating noise rather than meaningful edge in this market regime.",
    );
  } else {
    recs.push(
      "Run a parameter sensitivity test (vary stop-loss by ±1%) to confirm results are robust and not highly dependent on exact settings.",
    );
  }

  return recs.slice(0, 3);
}

// ── AI Insights ────────────────────────────────────────────────────────────

export function generateInsights(
  metrics: BacktestMetrics,
  risk: RiskLevel,
  timeframe: TimeframeHorizon,
): AiInsight[] {
  const insights: AiInsight[] = [];

  // 1. Risk-adjusted return (Sharpe)
  if (metrics.sharpe_ratio >= 1.5) {
    insights.push({
      type: "positive",
      title: "Strong risk-adjusted returns",
      text: `A Sharpe ratio of ${metrics.sharpe_ratio.toFixed(2)} indicates excellent return per unit of risk. This strategy generates meaningful alpha beyond what would be expected from market exposure alone.`,
    });
  } else if (metrics.sharpe_ratio >= 0.8) {
    insights.push({
      type: "neutral",
      title: "Moderate risk-adjusted returns",
      text: `A Sharpe ratio of ${metrics.sharpe_ratio.toFixed(2)} is acceptable but leaves room for improvement. Consider tightening entry conditions or adjusting stop-loss levels to improve capital efficiency.`,
    });
  } else {
    insights.push({
      type: "warning",
      title: "Low risk-adjusted returns",
      text: `A Sharpe ratio of ${metrics.sharpe_ratio.toFixed(2)} suggests the strategy takes on more risk than the returns justify. Try increasing the profit target or reducing position size to improve the ratio.`,
    });
  }

  // 2. Drawdown vs risk level expectation
  const ddAbs = Math.abs(metrics.max_drawdown_pct);
  const ddExpected = risk === "conservative" ? 15 : risk === "balanced" ? 25 : 40;
  if (ddAbs <= ddExpected * 0.6) {
    insights.push({
      type: "positive",
      title: "Well-controlled drawdown",
      text: `Max drawdown of ${ddAbs.toFixed(1)}% is well within expectations for a ${risk} strategy. The risk management parameters are working effectively to preserve capital during losing streaks.`,
    });
  } else if (ddAbs <= ddExpected) {
    insights.push({
      type: "neutral",
      title: "Drawdown within tolerance",
      text: `Max drawdown of ${ddAbs.toFixed(1)}% is within the expected range for this risk profile. Monitor closely — extended losing streaks could push drawdown higher in live trading.`,
    });
  } else {
    insights.push({
      type: "warning",
      title: "Drawdown exceeds expectations",
      text: `Max drawdown of ${ddAbs.toFixed(1)}% is higher than typical for a ${risk} strategy. Consider tightening the stop-loss from ${risk === "aggressive" ? "6%" : risk === "balanced" ? "3%" : "2%"} or reducing position sizing to limit downside.`,
    });
  }

  // 3. Win rate & trade frequency
  if (metrics.win_rate_pct >= 55 && metrics.total_trades >= 20) {
    insights.push({
      type: "positive",
      title: "High-accuracy trade signals",
      text: `A ${metrics.win_rate_pct.toFixed(1)}% win rate across ${metrics.total_trades} trades shows consistent signal quality. The strategy has a statistical edge — avoid over-optimizing, which could reduce robustness on unseen data.`,
    });
  } else if (metrics.win_rate_pct < 50 && metrics.profit_factor > 1.2) {
    insights.push({
      type: "neutral",
      title: "Low win rate, high profit factor",
      text: `With ${metrics.win_rate_pct.toFixed(1)}% win rate but a profit factor of ${metrics.profit_factor.toFixed(2)}, this strategy wins less often but wins bigger. Ensure you can psychologically tolerate extended losing streaks before trading live.`,
    });
  } else if (metrics.total_trades < 15) {
    insights.push({
      type: "neutral",
      title: "Limited trade sample",
      text: `Only ${metrics.total_trades} trades were generated. ${timeframe === "long" ? "Long-term strategies naturally trade less frequently, but" : "Consider extending the test period —"} a larger sample size would make these results more statistically reliable.`,
    });
  } else {
    insights.push({
      type: "neutral",
      title: "Average trade accuracy",
      text: `A ${metrics.win_rate_pct.toFixed(1)}% win rate is near the breakeven point. The strategy's edge comes more from trade sizing and profit factor (${metrics.profit_factor.toFixed(2)}) than raw accuracy. This is normal for trend-following systems.`,
    });
  }

  return insights;
}
