export const STRATEGY_TEMPLATES = {
  sma_crossover: {
    name: "SMA Crossover",
    description: "Go long when fast SMA crosses above slow SMA, exit when it crosses below.",
    code: `"""
SMA Crossover Strategy
"""

class Strategy:
    def __init__(self, params):
        self.fast_period = params.get("fast_period", 10)
        self.slow_period = params.get("slow_period", 30)
        self.prices = []

    def on_bar(self, bar, portfolio):
        self.prices.append(bar["close"])

        if len(self.prices) < self.slow_period:
            return

        fast_sma = sum(self.prices[-self.fast_period:]) / self.fast_period
        slow_sma = sum(self.prices[-self.slow_period:]) / self.slow_period

        position = portfolio.get_position(bar["symbol"])

        if fast_sma > slow_sma and position <= 0:
            portfolio.order_target_percent(bar["symbol"], 1.0)
        elif fast_sma < slow_sma and position > 0:
            portfolio.order_target_percent(bar["symbol"], 0.0)
`,
  },
  blank: {
    name: "Blank Strategy",
    description: "Empty template with the required Strategy class structure.",
    code: `"""
Custom Strategy
"""

class Strategy:
    def __init__(self, params):
        pass

    def on_bar(self, bar, portfolio):
        pass
`,
  },
} as const;

export type StrategyTemplateKey = keyof typeof STRATEGY_TEMPLATES;
