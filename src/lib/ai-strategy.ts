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
      `This strategy returned ${ret.toFixed(1)}%${symbol ? ` on ${symbol}` : ""} with a Sharpe of ${sharpe.toFixed(2)} — meaning each unit of risk generated ${sharpe.toFixed(2)}× in return. That combination indicates a genuine, well-constructed edge.`,
    );
  } else if (ret >= 10 && sharpe >= 1) {
    parts.push(
      `The strategy returned ${ret.toFixed(1)}%${symbol ? ` on ${symbol}` : ""} with a Sharpe of ${sharpe.toFixed(2)}. The risk-adjusted return is acceptable — not exceptional, but a real and repeatable edge if the test window is representative.`,
    );
  } else if (ret >= 0) {
    parts.push(
      `The strategy was marginally profitable${symbol ? ` on ${symbol}` : ""}, returning ${ret.toFixed(1)}%. With a Sharpe of ${sharpe.toFixed(2)}, most of that gain came with significant volatility attached — the edge is present but fragile and needs strengthening before live trading.`,
    );
  } else {
    parts.push(
      `This strategy lost ${Math.abs(ret).toFixed(1)}%${symbol ? ` on ${symbol}` : ""} over the test period. The signal logic is generating more noise than directional edge — the entry conditions need to be reviewed or tightened.`,
    );
  }

  // Middle: standout risk/reward factor
  if (dd > 30) {
    parts.push(
      `A ${dd.toFixed(1)}% max drawdown means the portfolio fell nearly ${Math.round(dd)}% from its peak at some point during the test. In live trading, that level of loss is psychologically very difficult to hold through — most traders cut exposure before recovery.`,
    );
  } else if (dd <= 15 && ret > 0) {
    parts.push(
      `Drawdown was held to ${dd.toFixed(1)}% — meaning the worst losing streak cost under ${Math.ceil(dd)}¢ per dollar invested while gains compounded. That level of capital preservation is a meaningful signal of edge quality.`,
    );
  }

  // Closer: behavioral observation
  if (wr < 45 && pf > 1.3) {
    parts.push(
      `The ${wr.toFixed(0)}% win rate seems low, but individual wins are large enough to more than offset the frequent small losses. This is how systematic trend-following works — the critical discipline is holding positions when it feels uncomfortable rather than cutting winners early.`,
    );
  } else if (wr >= 55 && pf < 1.3) {
    parts.push(
      `A ${wr.toFixed(0)}% win rate is high, but average wins are smaller than average losses — that gap leaves little margin for error. Widening profit targets by 20–30% could significantly improve the profit factor without sacrificing signal quality.`,
    );
  } else if (risk === "aggressive" && dd > 25) {
    parts.push(
      `The drawdown is consistent with an aggressive profile, but remember that live drawdowns often run 30–50% deeper than backtests. Even a 50% reduction in position size would roughly halve the drawdown while preserving the strategy's edge.`,
    );
  } else if (timeframe === "long" && metrics.total_trades < 20) {
    parts.push(
      `Long-term strategies generate fewer signals by design — ${metrics.total_trades} trades is expected at this timeframe. A 3–5 year test window would better separate genuine edge from market-specific luck and improve statistical confidence.`,
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
      `Cut position size to 40–50% of your intended allocation before live trading. At ${dd.toFixed(1)}% backtest drawdown, live conditions could push that to ${(dd * 1.5).toFixed(0)}%+ — the kind of loss most traders stop out of before recovering.`,
    );
  } else if (sharpe < 0.8 && metrics.total_return_pct > 0) {
    recs.push(
      "Tighten your stop-loss to improve risk/reward. A stop set at 1.5–2× the average trade's expected range would limit losers without cutting too many winners — and should move Sharpe above 1.0.",
    );
  } else if (risk === "aggressive" && sharpe < 1) {
    recs.push(
      `Aggressive position sizing isn't being rewarded here — Sharpe of ${sharpe.toFixed(2)} means the extra risk isn't generating extra return. Switch to a balanced profile (50–70% max position) and retest before increasing size.`,
    );
  } else {
    recs.push(
      "Position sizing looks appropriate for the backtest. In live trading, start at 50–60% of the backtest position size — this gives room to scale up once real-money performance confirms the edge holds.",
    );
  }

  // 2. Signal quality
  if (wr < 45 && pf < 1.2) {
    recs.push(
      `Win rate (${wr.toFixed(0)}%) and profit factor (${pf.toFixed(2)}) are both weak — the signal is generating frequent small losses without enough offsetting wins. Adding a trend filter (e.g. only take long signals when price is above the 200-day SMA) is usually the fastest way to improve both metrics.`,
    );
  } else if (wr >= 60 && pf < 1.5) {
    recs.push(
      `${wr.toFixed(0)}% win rate is strong, but winners are too small relative to losers (profit factor ${pf.toFixed(2)}). Increase profit targets by 20–30% — with this accuracy you can afford to let trades run, and it would meaningfully improve the overall profit factor.`,
    );
  } else if (trades < 15) {
    recs.push(
      `Only ${trades} trades executed — not enough to distinguish genuine edge from luck. Extend the test window by at least 1–2 years, or lower entry thresholds to generate more signals before drawing any conclusions from the results.`,
    );
  } else if (timeframe === "short" && sharpe >= 1.5) {
    recs.push(
      "Performance looks strong on this timeframe. Before live trading, paper trade for 3–4 weeks to verify the real signal quality matches the backtest — slippage and timing gaps often erode short-timeframe edges significantly.",
    );
  } else {
    recs.push(
      `${timeframe === "long" ? "Test this strategy on a medium-term interval (daily vs weekly)" : "Run this strategy on 2–3 additional symbols"} to verify the edge isn't specific to this one market or period. Real edge generalizes — time-specific luck doesn't.`,
    );
  }

  // 3. Validation / next step
  if (sharpe >= 1.5 && dd <= 20) {
    recs.push(
      "Results are strong enough to warrant out-of-sample validation. Run the exact same parameters on a date range not used in this test — if performance holds within 30–40% of these results, the edge is likely real and not overfit.",
    );
  } else if (metrics.total_return_pct < 0) {
    recs.push(
      "Before abandoning this strategy, isolate one change at a time: try a simpler entry condition or a different timeframe on the same symbol. A single parameter is often responsible for most of the underperformance.",
    );
  } else {
    recs.push(
      "Run a sensitivity test: vary the stop-loss by ±1% and the take-profit by ±2%, then compare results. If key metrics hold up across these variations, the strategy is robust. If they collapse, the current settings are overfit to this specific period.",
    );
  }

  return recs.slice(0, 3);
}

// ── Risk Label ─────────────────────────────────────────────────────────────

export type RiskLabelType = "low" | "medium" | "high";

export interface RiskLabelResult {
  level: RiskLabelType;
  label: string;
  description: string;
}

export function generateRiskLabel(metrics: BacktestMetrics): RiskLabelResult {
  const dd = Math.abs(metrics.max_drawdown_pct);
  const vol = metrics.volatility_pct;
  const sharpe = metrics.sharpe_ratio;

  if (dd > 30 || (vol > 25 && sharpe < 1)) {
    return {
      level: "high",
      label: "High Risk",
      description: `${dd.toFixed(1)}% peak drawdown — significant capital exposure. Not suitable for live trading without tighter position sizing.`,
    };
  }

  if (dd <= 15 && vol <= 18 && sharpe >= 0.8) {
    return {
      level: "low",
      label: "Low Risk",
      description: `${dd.toFixed(1)}% max drawdown with ${vol.toFixed(1)}% annualized volatility — well-controlled downside suitable for conservative accounts.`,
    };
  }

  return {
    level: "medium",
    label: "Medium Risk",
    description: `${dd.toFixed(1)}% max drawdown and ${vol.toFixed(1)}% volatility — moderate exposure. Size positions accordingly.`,
  };
}

// ── When it works / When it fails ──────────────────────────────────────────

export interface StrategyConditions {
  works: string;
  fails: string;
}

export function generateWhenItWorksAndFails(
  metrics: BacktestMetrics,
  risk?: RiskLevel,
  timeframe?: TimeframeHorizon,
): StrategyConditions {
  const sharpe = metrics.sharpe_ratio;
  const wr = metrics.win_rate_pct;
  const pf = metrics.profit_factor;
  const dd = Math.abs(metrics.max_drawdown_pct);

  if (wr >= 55 && pf >= 1.5) {
    return {
      works: "Performs best in trending markets with consistent directional momentum. High accuracy signals suggest the entry logic is well-calibrated to the timeframe.",
      fails: "Likely to struggle in choppy, sideways markets where signals trigger frequently but price follow-through is weak.",
    };
  }

  if (wr < 45 && pf >= 1.3) {
    return {
      works: "Designed to capture large directional moves — works well in high-momentum regimes where a few big trades drive most of the returns.",
      fails: "Extended range-bound periods will produce repeated small losses. Requires psychological tolerance for losing streaks of 4–8 consecutive trades.",
    };
  }

  if (sharpe >= 1.5 && dd <= 20) {
    return {
      works: "Demonstrates strong risk-adjusted performance across varying conditions. The combination of controlled drawdown and high Sharpe suggests resilience across market regimes.",
      fails: "May underperform during extreme volatility events or structural regime changes where historical price patterns break down.",
    };
  }

  if (dd > 30) {
    return {
      works: "Can generate outsized returns during strong trending conditions when momentum aligns with the signal direction over sustained periods.",
      fails: "High drawdown indicates vulnerability during trend reversals and spike volatility events. Reduce position size before trading live.",
    };
  }

  if (timeframe === "long") {
    return {
      works: "Best suited for sustained macro trends spanning multiple months. Works well in directional bull or bear markets with clear bias.",
      fails: "Will underperform during range-bound years or frequent trend reversals, where few valid entry signals are generated.",
    };
  }

  if (timeframe === "short" || risk === "aggressive") {
    return {
      works: "Captures short-term momentum effectively in liquid markets with consistent price action and tight bid-ask spreads.",
      fails: "Sensitive to slippage, transaction costs, and news-driven volatility spikes that can invalidate signals before they play out.",
    };
  }

  return {
    works: "Performs best when market volatility aligns with the strategy's expected signal frequency and the trend environment is clear.",
    fails: "Performance degrades when market conditions shift significantly from the backtest period — regular re-evaluation is recommended.",
  };
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
      text: `A Sharpe of ${metrics.sharpe_ratio.toFixed(2)} means the strategy earned ${metrics.sharpe_ratio.toFixed(2)}× return per unit of risk — well above the 1.0 benchmark. This level is rare and indicates genuine edge rather than just favorable market conditions during the test period.`,
    });
  } else if (metrics.sharpe_ratio >= 0.8) {
    insights.push({
      type: "neutral",
      title: "Acceptable risk-adjusted returns",
      text: `A Sharpe of ${metrics.sharpe_ratio.toFixed(2)} is workable but leaves room to grow. Tightening entry conditions or trimming the stop-loss by 0.5–1% typically moves Sharpe from this range into the 1.0–1.5 zone without sacrificing trade frequency.`,
    });
  } else {
    insights.push({
      type: "warning",
      title: "Risk isn't being rewarded",
      text: `A Sharpe of ${metrics.sharpe_ratio.toFixed(2)} means the strategy is absorbing more volatility than the returns justify. The most common fix: stricter entry conditions that trade less often but with higher conviction per trade.`,
    });
  }

  // 2. Drawdown vs risk level expectation
  const ddAbs = Math.abs(metrics.max_drawdown_pct);
  const ddExpected = risk === "conservative" ? 15 : risk === "balanced" ? 25 : 40;
  if (ddAbs <= ddExpected * 0.6) {
    insights.push({
      type: "positive",
      title: "Drawdown well within safe range",
      text: `At ${ddAbs.toFixed(1)}%, drawdown is significantly below the ${ddExpected}% threshold typical for a ${risk} strategy. This means risk controls are working — the strategy can absorb a bad period without triggering forced position reductions or a crisis of confidence.`,
    });
  } else if (ddAbs <= ddExpected) {
    insights.push({
      type: "neutral",
      title: "Drawdown within acceptable range",
      text: `At ${ddAbs.toFixed(1)}%, drawdown sits within the expected range for this risk profile. Note: live drawdowns often run 30–50% deeper than backtests due to slippage and delayed signals — worth sizing positions conservatively at first.`,
    });
  } else {
    insights.push({
      type: "warning",
      title: "Drawdown exceeds safe range",
      text: `At ${ddAbs.toFixed(1)}%, drawdown is higher than typical for a ${risk} strategy. The most likely cause: positions held through extended losing periods. Tightening the stop-loss from ${risk === "aggressive" ? "6%" : risk === "balanced" ? "3%" : "2%"} to ${risk === "aggressive" ? "4%" : risk === "balanced" ? "2%" : "1.5%"} is the most direct fix.`,
    });
  }

  // 3. Win rate & trade frequency
  if (metrics.win_rate_pct >= 55 && metrics.total_trades >= 20) {
    insights.push({
      type: "positive",
      title: "High-accuracy entry signals",
      text: `${metrics.win_rate_pct.toFixed(0)}% win rate across ${metrics.total_trades} trades shows the entry logic is consistently identifying good setups. With accuracy this high, you can afford to widen profit targets — most robust strategies at this win rate push take-profit levels before scaling up.`,
    });
  } else if (metrics.win_rate_pct < 50 && metrics.profit_factor > 1.2) {
    insights.push({
      type: "neutral",
      title: "Low win rate with positive edge",
      text: `Winning ${metrics.win_rate_pct.toFixed(0)}% of trades but maintaining a ${metrics.profit_factor.toFixed(2)} profit factor means individual wins are substantially larger than losses. This is a legitimate style — but it requires psychological discipline through losing streaks of 4–8 consecutive trades.`,
    });
  } else if (metrics.total_trades < 15) {
    insights.push({
      type: "neutral",
      title: "Sample size too small to be conclusive",
      text: `${metrics.total_trades} trades isn't enough to draw reliable conclusions — even a coin flip produces short streaks that look like patterns. ${timeframe === "long" ? "For long-term strategies, a 3–5 year window is the minimum for statistical significance." : "Extend the test window or loosen entry conditions to generate more data."}`,
    });
  } else {
    insights.push({
      type: "neutral",
      title: "Neutral trade accuracy",
      text: `At ${metrics.win_rate_pct.toFixed(0)}%, win rate is near breakeven — but the profit factor of ${metrics.profit_factor.toFixed(2)} shows winners are meaningfully larger than losers. This pattern is normal and sustainable for systematic trend-following strategies.`,
    });
  }

  return insights;
}
