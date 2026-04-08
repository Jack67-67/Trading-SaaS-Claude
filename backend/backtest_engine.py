"""
Event-driven backtest engine.

Usage
-----
    from backtest_engine import run_backtest

    results = run_backtest(
        strategy_code = "class Strategy: ...",
        bars          = [{"timestamp": ..., "open": ..., "high": ...,
                          "low": ..., "close": ..., "volume": ..., "symbol": ...}],
        params        = {"fast_period": 20, "slow_period": 50},
        risk          = {"stop_loss_pct": 2, "max_position_pct": 60},
        initial_capital = 100_000.0,
    )

The strategy class must implement:
    def __init__(self, params: dict): ...
    def on_bar(self, bar: dict, portfolio: Portfolio): ...

`bar` keys: timestamp, open, high, low, close, volume, symbol
`portfolio` methods: get_position(symbol), order_target_percent(symbol, pct)

Results dict mirrors the shape expected by the frontend:
{
    "metrics": { total_return_pct, annualized_return_pct, sharpe_ratio, ... },
    "equity_curve": [{ "timestamp": str, "equity": float, "drawdown_pct": float }],
    "trades": [],
}
"""

from __future__ import annotations

import math
import statistics
from typing import Any


# ── Portfolio ──────────────────────────────────────────────────────────────────


class Portfolio:
    """
    Tracks cash, positions, and records trades.

    Positions are in fractional shares.
    All executions happen at the current bar's close price (market-on-close).
    """

    def __init__(self, initial_capital: float = 100_000.0) -> None:
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.positions: dict[str, float] = {}        # symbol → shares
        self._entry_prices: dict[str, float] = {}    # symbol → avg entry price
        self._current_bar: dict[str, Any] | None = None
        self.closed_trades: list[dict[str, Any]] = []  # closed round-trip trades

    # ── Public API (called by strategy code) ──────────────────────────────────

    def get_position(self, symbol: str) -> float:
        """Return the number of shares held for `symbol` (0 if none)."""
        return self.positions.get(symbol, 0.0)

    def order_target_percent(self, symbol: str, target_pct: float) -> None:
        """
        Rebalance `symbol` to `target_pct` of total equity.

        target_pct = 1.0  → fully invested
        target_pct = 0.0  → fully flat
        target_pct = 0.5  → half of equity in this position
        """
        if self._current_bar is None:
            return

        price = self._current_bar["close"]
        if price <= 0:
            return

        target_pct = max(0.0, min(1.0, target_pct))

        total_eq   = self._total_equity(price, symbol)
        target_val = total_eq * target_pct
        cur_shares = self.positions.get(symbol, 0.0)
        cur_val    = cur_shares * price
        diff_val   = target_val - cur_val

        # Convert value difference to shares
        diff_shares = diff_val / price

        # Clamp buy to available cash
        if diff_shares > 0:
            max_buy = self.cash / price
            diff_shares = min(diff_shares, max_buy)

        if abs(diff_shares) < 1e-6:
            return

        new_shares = max(0.0, cur_shares + diff_shares)
        cost       = diff_shares * price   # positive = buy, negative = sell

        # ── Close / partial-close → record PnL ──────────────────────────────
        if diff_shares < 0 and cur_shares > 0:
            sold_shares = min(abs(diff_shares), cur_shares)
            entry_px    = self._entry_prices.get(symbol, price)
            pnl         = (price - entry_px) * sold_shares
            ret_pct     = (price / entry_px - 1) * 100 if entry_px > 0 else 0.0
            self.closed_trades.append(
                {
                    "timestamp":   self._current_bar["timestamp"],
                    "symbol":      symbol,
                    "entry_price": round(entry_px, 4),
                    "exit_price":  round(price, 4),
                    "shares":      round(sold_shares, 6),
                    "pnl":         round(pnl, 2),
                    "return_pct":  round(ret_pct, 3),
                }
            )

        # ── Open / add to position → update average entry price ───────────────
        if diff_shares > 0:
            if cur_shares <= 0:
                self._entry_prices[symbol] = price
            else:
                prev_entry = self._entry_prices.get(symbol, price)
                self._entry_prices[symbol] = (
                    (cur_shares * prev_entry + diff_shares * price) / new_shares
                )

        # ── Settle cash & shares ──────────────────────────────────────────────
        self.cash      -= cost
        if new_shares < 1e-9:
            self.positions.pop(symbol, None)
            self._entry_prices.pop(symbol, None)
        else:
            self.positions[symbol] = new_shares

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _total_equity(self, current_price: float, current_symbol: str) -> float:
        """Mark-to-market equity using current_price for current_symbol."""
        equity = self.cash
        for sym, shares in self.positions.items():
            # Use the provided current price for the active symbol.
            # For multi-symbol strategies a proper implementation would need
            # a price map; for single-symbol this is exact.
            equity += shares * current_price
        return equity

    @property
    def total_equity(self) -> float:
        if self._current_bar is None:
            return self.cash
        return self._total_equity(
            self._current_bar["close"], self._current_bar["symbol"]
        )


# ── Metrics computation ────────────────────────────────────────────────────────


def _compute_metrics(
    equity_curve: list[dict[str, Any]],
    closed_trades: list[dict[str, Any]],
    initial_capital: float,
    n_bars: int,
) -> dict[str, Any]:
    """Compute all metrics from the equity curve and closed-trade list."""

    equities = [pt["equity"] for pt in equity_curve]
    final_equity = equities[-1] if equities else initial_capital

    total_return_pct = (final_equity / initial_capital - 1) * 100

    # Annualised return (252 trading days per year)
    years = max(n_bars / 252, 1 / 252)
    annualized_return_pct = ((1 + total_return_pct / 100) ** (1 / years) - 1) * 100

    # Daily returns from equity curve
    daily_returns: list[float] = []
    for i in range(1, len(equities)):
        if equities[i - 1] > 0:
            daily_returns.append(equities[i] / equities[i - 1] - 1)

    if len(daily_returns) >= 2:
        mean_r = statistics.mean(daily_returns)
        std_r  = statistics.stdev(daily_returns)
        sharpe = (mean_r / std_r * math.sqrt(252)) if std_r > 0 else 0.0

        downside = [r for r in daily_returns if r < 0]
        down_std = statistics.stdev(downside) if len(downside) >= 2 else std_r
        sortino  = (mean_r / down_std * math.sqrt(252)) if down_std > 0 else 0.0

        volatility_pct = std_r * math.sqrt(252) * 100
    else:
        sharpe = sortino = volatility_pct = 0.0

    # Max drawdown (already computed during simulation; take it from the curve)
    max_dd_pct = max((pt["drawdown_pct"] for pt in equity_curve), default=0.0)

    # Calmar ratio
    calmar = (annualized_return_pct / max_dd_pct) if max_dd_pct > 0 else 0.0

    # Trade statistics
    n_trades = len(closed_trades)
    if n_trades > 0:
        winners = [t for t in closed_trades if t["pnl"] > 0]
        losers  = [t for t in closed_trades if t["pnl"] <= 0]

        win_rate_pct  = len(winners) / n_trades * 100
        gross_profit  = sum(t["pnl"] for t in winners)
        gross_loss    = abs(sum(t["pnl"] for t in losers))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (2.0 if gross_profit > 0 else 1.0)

        returns = [t["return_pct"] for t in closed_trades]
        avg_trade_return_pct = statistics.mean(returns) if returns else 0.0

        # Max consecutive wins / losses
        max_consec_wins = max_consec_losses = 0
        cur_wins = cur_losses = 0
        for t in closed_trades:
            if t["pnl"] > 0:
                cur_wins   += 1
                cur_losses  = 0
            else:
                cur_losses += 1
                cur_wins    = 0
            max_consec_wins   = max(max_consec_wins,   cur_wins)
            max_consec_losses = max(max_consec_losses, cur_losses)
    else:
        win_rate_pct = avg_trade_return_pct = 0.0
        profit_factor = 1.0
        max_consec_wins = max_consec_losses = 0

    return {
        "total_return_pct":       round(total_return_pct,       2),
        "annualized_return_pct":  round(annualized_return_pct,  2),
        "sharpe_ratio":           round(sharpe,                  2),
        "sortino_ratio":          round(sortino,                 2),
        "max_drawdown_pct":       round(max_dd_pct,              2),
        "win_rate_pct":           round(win_rate_pct,            1),
        "profit_factor":          round(profit_factor,           2),
        "total_trades":           n_trades,
        "avg_trade_return_pct":   round(avg_trade_return_pct,    3),
        "max_consecutive_wins":   max_consec_wins,
        "max_consecutive_losses": max_consec_losses,
        "calmar_ratio":           round(calmar,                  2),
        "volatility_pct":         round(volatility_pct,          1),
    }


# ── Main entry point ───────────────────────────────────────────────────────────


def run_backtest(
    strategy_code: str,
    bars: list[dict[str, Any]],
    params: dict[str, Any],
    risk: dict[str, Any],
    initial_capital: float = 100_000.0,
) -> dict[str, Any]:
    """
    Execute a strategy against historical OHLC bars and return a results dict.

    Parameters
    ----------
    strategy_code   : Python source defining a `Strategy` class
    bars            : list of OHLC bar dicts sorted oldest-first
    params          : strategy params dict (passed to Strategy.__init__)
    risk            : risk params dict (merged into params)
    initial_capital : starting portfolio value in USD

    Returns
    -------
    Dict with keys: "metrics", "equity_curve", "trades"
    """
    if not bars:
        raise ValueError("No bars provided to the backtest engine.")

    # Merge risk params into strategy params so strategies can access both
    merged_params = {**params, **risk}

    # ── Load strategy class from user code ───────────────────────────────────
    namespace: dict[str, Any] = {}
    try:
        exec(strategy_code, namespace)  # noqa: S102
    except SyntaxError as exc:
        raise ValueError(f"Strategy code has a syntax error: {exc}") from exc

    StrategyClass = namespace.get("Strategy")
    if StrategyClass is None:
        raise ValueError(
            "Strategy code must define a class named 'Strategy'. "
            "Check that your class is spelled correctly."
        )

    try:
        strategy = StrategyClass(merged_params)
    except Exception as exc:
        raise ValueError(f"Strategy __init__ raised an error: {exc}") from exc

    # ── Run event loop ───────────────────────────────────────────────────────
    portfolio    = Portfolio(initial_capital)
    equity_curve: list[dict[str, Any]] = []
    peak_equity  = initial_capital
    max_drawdown = 0.0

    for bar in bars:
        portfolio._current_bar = bar

        try:
            strategy.on_bar(bar, portfolio)
        except Exception as exc:
            raise ValueError(
                f"Strategy raised an error on bar {bar['timestamp']}: {exc}"
            ) from exc

        equity = portfolio.total_equity
        drawdown_pct = 0.0

        if equity > peak_equity:
            peak_equity = equity
        elif peak_equity > 0:
            drawdown_pct = (peak_equity - equity) / peak_equity * 100
            if drawdown_pct > max_drawdown:
                max_drawdown = drawdown_pct

        equity_curve.append(
            {
                "timestamp":    bar["timestamp"],
                "equity":       round(equity, 2),
                "drawdown_pct": round(drawdown_pct, 2),
            }
        )

    # ── Compute metrics ──────────────────────────────────────────────────────
    metrics = _compute_metrics(
        equity_curve    = equity_curve,
        closed_trades   = portfolio.closed_trades,
        initial_capital = initial_capital,
        n_bars          = len(bars),
    )

    buy_and_hold_return_pct = round(
        (bars[-1]["close"] / bars[0]["close"] - 1) * 100, 2
    ) if bars[0]["close"] > 0 else 0.0

    return {
        "metrics":                  metrics,
        "equity_curve":             equity_curve,
        "trades":                   [],  # detailed trades omitted from frontend payload for now
        "buy_and_hold_return_pct":  buy_and_hold_return_pct,
    }
