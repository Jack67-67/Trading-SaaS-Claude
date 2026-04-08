export type StrategyDifficulty = "beginner" | "intermediate";

export interface StrategyTemplate {
  name: string;
  tagline: string;
  description: string;
  difficulty: StrategyDifficulty;
  code: string;
}

export const STRATEGY_TEMPLATES = {
  sma_crossover: {
    name: "SMA Crossover",
    tagline: "Buy when fast MA crosses above slow MA",
    description: "Classic trend-following strategy. Buy when the 10-day average crosses above the 30-day average, sell when it crosses back below.",
    difficulty: "beginner",
    code: `class Strategy:
    def __init__(self, params):
        self.fast_period = params.get("fast_period", 10)
        self.slow_period = params.get("slow_period", 30)
        self.closes = []

    def on_bar(self, bar, portfolio):
        self.closes.append(bar["close"])

        if len(self.closes) < self.slow_period:
            return  # Not enough data yet

        fast_sma = sum(self.closes[-self.fast_period:]) / self.fast_period
        slow_sma = sum(self.closes[-self.slow_period:]) / self.slow_period

        symbol = bar["symbol"]
        position = portfolio.get_position(symbol)

        if fast_sma > slow_sma and position <= 0:
            portfolio.order_target_percent(symbol, 1.0)  # Go fully long
        elif fast_sma < slow_sma and position > 0:
            portfolio.order_target_percent(symbol, 0.0)  # Exit to cash
`,
  } satisfies StrategyTemplate,

  rsi: {
    name: "RSI Mean Reversion",
    tagline: "Buy oversold, sell overbought",
    description: "Buys when the RSI indicator drops below 30 (oversold) and sells when it rises above 70 (overbought). Works well in ranging markets.",
    difficulty: "beginner",
    code: `class Strategy:
    def __init__(self, params):
        self.period     = params.get("rsi_period", 14)
        self.oversold   = params.get("oversold", 30)
        self.overbought = params.get("overbought", 70)
        self.closes = []

    def _rsi(self):
        changes = [self.closes[i] - self.closes[i - 1] for i in range(-self.period, 0)]
        gains = sum(c for c in changes if c > 0) / self.period
        losses = sum(-c for c in changes if c < 0) / self.period
        if losses == 0:
            return 100.0
        rs = gains / losses
        return 100 - (100 / (1 + rs))

    def on_bar(self, bar, portfolio):
        self.closes.append(bar["close"])

        if len(self.closes) < self.period + 1:
            return  # Not enough data yet

        rsi = self._rsi()
        symbol = bar["symbol"]
        position = portfolio.get_position(symbol)

        if rsi < self.oversold and position <= 0:
            portfolio.order_target_percent(symbol, 1.0)  # Oversold — buy
        elif rsi > self.overbought and position > 0:
            portfolio.order_target_percent(symbol, 0.0)  # Overbought — exit
`,
  } satisfies StrategyTemplate,

  momentum: {
    name: "Price Breakout",
    tagline: "Buy new highs, ride the momentum",
    description: "Buys when price breaks out to a 20-day high (momentum signal). Exits when price drops to a 10-day low. Captures strong trending moves.",
    difficulty: "intermediate",
    code: `class Strategy:
    def __init__(self, params):
        self.entry_lookback = params.get("entry_lookback", 20)
        self.exit_lookback  = params.get("exit_lookback", 10)
        self.closes = []

    def on_bar(self, bar, portfolio):
        self.closes.append(bar["close"])

        if len(self.closes) < self.entry_lookback + 1:
            return  # Not enough data yet

        current = bar["close"]
        # Highest close in the N days before today
        prior_high = max(self.closes[-(self.entry_lookback + 1):-1])
        # Lowest close over the exit window (including today)
        recent_low = min(self.closes[-self.exit_lookback:])

        symbol = bar["symbol"]
        position = portfolio.get_position(symbol)

        if current > prior_high and position <= 0:
            portfolio.order_target_percent(symbol, 1.0)  # Breakout — buy
        elif current < recent_low and position > 0:
            portfolio.order_target_percent(symbol, 0.0)  # Trailing stop — exit
`,
  } satisfies StrategyTemplate,

  mean_reversion: {
    name: "Mean Reversion",
    tagline: "Buy dips, sell the recovery",
    description: "Buys when price drops more than 3% below its 20-day average (expecting a bounce back). Exits when price returns to the average.",
    difficulty: "intermediate",
    code: `class Strategy:
    def __init__(self, params):
        self.period    = params.get("period", 20)
        self.threshold = params.get("threshold", 0.03)  # 3% below SMA
        self.closes = []

    def on_bar(self, bar, portfolio):
        self.closes.append(bar["close"])

        if len(self.closes) < self.period:
            return  # Not enough data yet

        sma = sum(self.closes[-self.period:]) / self.period
        current = bar["close"]
        pct_from_sma = (current - sma) / sma  # Negative = price below SMA

        symbol = bar["symbol"]
        position = portfolio.get_position(symbol)

        if pct_from_sma < -self.threshold and position <= 0:
            portfolio.order_target_percent(symbol, 1.0)  # Price is a dip — buy
        elif pct_from_sma >= 0 and position > 0:
            portfolio.order_target_percent(symbol, 0.0)  # Returned to SMA — exit
`,
  } satisfies StrategyTemplate,

  blank: {
    name: "Blank",
    tagline: "Write your own rules from scratch",
    description: "An empty strategy skeleton. Fill in on_bar() with your own buy and sell logic.",
    difficulty: "intermediate",
    code: `class Strategy:
    def __init__(self, params):
        # Store any parameters you need
        # e.g. self.period = params.get("period", 20)
        pass

    def on_bar(self, bar, portfolio):
        # Called once per price bar (e.g. once per day for daily data)
        # bar["close"]  — today's closing price
        # bar["symbol"] — the ticker symbol
        # portfolio.get_position(bar["symbol"]) — shares currently held (0 if flat)
        # portfolio.order_target_percent(bar["symbol"], 1.0) — go fully long
        # portfolio.order_target_percent(bar["symbol"], 0.0) — exit to cash
        pass
`,
  } satisfies StrategyTemplate,
} as const;

export type StrategyTemplateKey = keyof typeof STRATEGY_TEMPLATES;
