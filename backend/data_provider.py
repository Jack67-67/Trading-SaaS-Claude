"""
Polygon.io market data provider.

Fetches adjusted OHLC bars via the Aggregates endpoint:
  GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}

Supports:
  - Stocks:  SPY, QQQ, AAPL, MSFT, TSLA, AMZN, NVDA
  - Crypto:  BTC/USDT → X:BTCUSD, ETH/USDT → X:ETHUSD
  - Forex:   EUR/USD  → C:EURUSD, etc.

Returns bars sorted oldest-first, each bar:
  {
    "timestamp": "YYYY-MM-DD",
    "open":   float,
    "high":   float,
    "low":    float,
    "close":  float,
    "volume": float,
    "symbol": str,       # original symbol string
  }
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

POLYGON_BASE = "https://api.polygon.io"

# ── Symbol mapping ─────────────────────────────────────────────────────────────

_CRYPTO_MAP: dict[str, str] = {
    "BTC/USDT": "X:BTCUSD",
    "ETH/USDT": "X:ETHUSD",
}

_FOREX_MAP: dict[str, str] = {
    "EUR/USD": "C:EURUSD",
    "GBP/USD": "C:GBPUSD",
    "USD/JPY": "C:USDJPY",
}

# Stocks pass through unchanged
_STOCK_SYMBOLS: set[str] = {"SPY", "QQQ", "AAPL", "MSFT", "TSLA", "AMZN", "NVDA"}


def _resolve_ticker(symbol: str) -> str:
    if symbol in _CRYPTO_MAP:
        return _CRYPTO_MAP[symbol]
    if symbol in _FOREX_MAP:
        return _FOREX_MAP[symbol]
    if symbol in _STOCK_SYMBOLS:
        return symbol
    # Optimistic pass-through for any other stock tickers
    return symbol


# ── Interval mapping ───────────────────────────────────────────────────────────

_INTERVAL_MAP: dict[str, tuple[int, str]] = {
    "1m":  (1,  "minute"),
    "5m":  (5,  "minute"),
    "15m": (15, "minute"),
    "1h":  (1,  "hour"),
    "4h":  (4,  "hour"),
    "1d":  (1,  "day"),
    "1w":  (1,  "week"),
}


def _resolve_interval(interval: str) -> tuple[int, str]:
    return _INTERVAL_MAP.get(interval, (1, "day"))


# ── Core fetch ─────────────────────────────────────────────────────────────────


def fetch_ohlc(
    symbol: str,
    interval: str,
    start: str | None,
    end: str | None,
    api_key: str,
) -> list[dict[str, Any]]:
    """
    Fetch adjusted OHLC bars from Polygon.

    Parameters
    ----------
    symbol   : frontend symbol string, e.g. "SPY" or "BTC/USDT"
    interval : frontend interval string, e.g. "1d"
    start    : ISO date "YYYY-MM-DD", or None (defaults to 2 years ago)
    end      : ISO date "YYYY-MM-DD", or None (defaults to today)
    api_key  : Polygon API key

    Returns
    -------
    List of bar dicts sorted oldest-first.
    """
    if not api_key:
        raise ValueError("POLYGON_API_KEY is not configured in the backend environment.")

    today = datetime.now(timezone.utc).date()
    from_date = start or str(today - timedelta(days=730))
    to_date   = end   or str(today)

    ticker = _resolve_ticker(symbol)
    multiplier, timespan = _resolve_interval(interval)

    url = (
        f"{POLYGON_BASE}/v2/aggs/ticker/{ticker}"
        f"/range/{multiplier}/{timespan}/{from_date}/{to_date}"
    )

    resp = httpx.get(
        url,
        params={
            "adjusted": "true",
            "sort":     "asc",
            "limit":    50000,
            "apiKey":   api_key,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    status = data.get("status", "")
    if status not in ("OK", "DELAYED"):
        error_detail = data.get("error") or data.get("message") or status
        raise ValueError(
            f"Polygon returned status '{status}' for {symbol}: {error_detail}"
        )

    raw_bars = data.get("results") or []
    if not raw_bars:
        raise ValueError(
            f"No data from Polygon for {symbol} ({from_date} → {to_date}). "
            f"Check that the symbol is valid and the date range is not in the future "
            f"or outside market hours."
        )

    bars: list[dict[str, Any]] = []
    for r in raw_bars:
        ts = datetime.fromtimestamp(r["t"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        bars.append(
            {
                "timestamp": ts,
                "open":      float(r["o"]),
                "high":      float(r["h"]),
                "low":       float(r["l"]),
                "close":     float(r["c"]),
                "volume":    float(r.get("v", 0)),
                "symbol":    symbol,
            }
        )

    return bars
