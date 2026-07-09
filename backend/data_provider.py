"""
Polygon.io market data provider.

Fetches adjusted OHLC bars via the Aggregates endpoint:
  GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}

For high-frequency intervals (1m, 5m, 15m, 30m) the full date range is split
into smaller chunks so that each individual HTTP request stays fast and well
within Polygon's 50,000-bar-per-request limit.  Each chunk is retried up to
3 times with exponential back-off before the error is surfaced.

Supports:
  - Stocks:  SPY, QQQ, AAPL, MSFT, TSLA, AMZN, NVDA (and any pass-through ticker)
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
    "symbol": str,
  }
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone, date as date_type
from typing import Any

import httpx

log = logging.getLogger("backtest")

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


def _resolve_ticker(symbol: str) -> str:
    if symbol in _CRYPTO_MAP:
        return _CRYPTO_MAP[symbol]
    if symbol in _FOREX_MAP:
        return _FOREX_MAP[symbol]
    # Stocks and any other symbol pass through unchanged
    return symbol


# ── Interval mapping ───────────────────────────────────────────────────────────

_INTERVAL_MAP: dict[str, tuple[int, str]] = {
    "1m":  (1,  "minute"),
    "5m":  (5,  "minute"),
    "15m": (15, "minute"),
    "30m": (30, "minute"),
    "1h":  (1,  "hour"),
    "4h":  (4,  "hour"),
    "1d":  (1,  "day"),
    "1w":  (1,  "week"),
}


def _resolve_interval(interval: str) -> tuple[int, str]:
    return _INTERVAL_MAP.get(interval, (1, "day"))


# ── Chunk sizing ───────────────────────────────────────────────────────────────
#
# Each chunk is fetched as a separate HTTP request to keep individual payloads
# small (<15k bars).  Intervals with ≤ 1 bar/day use a single request.
#
#   1m  → 30-day chunks  ≈ 30 × 390 =  11,700 bars  (fast, ~1-2s each)
#   5m  → 90-day chunks  ≈ 90 × 78  =   7,020 bars
#  15m  → 180-day chunks ≈ 180 × 26 =   4,680 bars
#  30m  → 365-day chunks ≈ 365 × 13 =   4,745 bars
#   1h+ → no chunking    (full range in one request)

_CHUNK_DAYS: dict[str, int] = {
    "1m":  30,
    "5m":  90,
    "15m": 180,
    "30m": 365,
}

# Per-chunk read timeout (seconds).  Kept low because each chunk is small.
_CHUNK_TIMEOUT = 60

# Max attempts per chunk before propagating the error
_MAX_ATTEMPTS = 3


# ── Date range helpers ─────────────────────────────────────────────────────────


def _date_chunks(from_str: str, to_str: str, chunk_days: int) -> list[tuple[str, str]]:
    """Split [from_str, to_str] into non-overlapping sub-ranges of ≤ chunk_days days."""
    start = datetime.strptime(from_str, "%Y-%m-%d").date()
    end   = datetime.strptime(to_str,   "%Y-%m-%d").date()
    chunks: list[tuple[str, str]] = []
    cursor = start
    while cursor <= end:
        chunk_end = min(cursor + timedelta(days=chunk_days - 1), end)
        chunks.append((str(cursor), str(chunk_end)))
        cursor = chunk_end + timedelta(days=1)
    return chunks


# ── Single-chunk fetch with retry ─────────────────────────────────────────────


def _fetch_chunk(
    ticker: str,
    multiplier: int,
    timespan: str,
    from_date: str,
    to_date: str,
    api_key: str,
    symbol: str,
) -> list[dict[str, Any]]:
    """
    Fetch one date-range chunk from Polygon with up to _MAX_ATTEMPTS retries
    on network/read timeouts using exponential back-off (1 s, 2 s, 4 s…).

    Raises ValueError with a human-readable message on permanent failure.
    """
    url = (
        f"{POLYGON_BASE}/v2/aggs/ticker/{ticker}"
        f"/range/{multiplier}/{timespan}/{from_date}/{to_date}"
    )
    params = {
        "adjusted": "true",
        "sort":     "asc",
        "limit":    50000,
        "apiKey":   api_key,
    }

    last_error: Exception | None = None

    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            wait = 2 ** (attempt - 1)
            log.warning("  chunk retry attempt=%d  wait=%ds  %s → %s",
                        attempt + 1, wait, from_date, to_date)
            time.sleep(wait)

        t0 = time.monotonic()
        try:
            resp = httpx.get(url, params=params, timeout=_CHUNK_TIMEOUT)
        except httpx.TimeoutException as exc:
            log.warning("  chunk timeout  attempt=%d  elapsed=%.1fs  %s → %s",
                        attempt + 1, time.monotonic() - t0, from_date, to_date)
            last_error = exc
            continue   # retry
        except httpx.RequestError as exc:
            raise ValueError(
                f"Network error fetching market data for {symbol} "
                f"({from_date} → {to_date}): {exc}"
            ) from exc

        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code == 429:
                # Rate-limited — back off and retry
                last_error = exc
                time.sleep(2 ** attempt)
                continue
            raise ValueError(
                f"Polygon API returned HTTP {status_code} for {symbol}. "
                "Check your POLYGON_API_KEY and that the symbol is supported."
            ) from exc

        data = resp.json()
        polygon_status = data.get("status", "")
        if polygon_status not in ("OK", "DELAYED"):
            error_detail = data.get("error") or data.get("message") or polygon_status
            raise ValueError(
                f"Polygon returned status '{polygon_status}' for {symbol}: {error_detail}"
            )

        chunk_bars = data.get("results") or []
        log.info("  chunk ok  %s → %s  bars=%d  elapsed=%.1fs",
                 from_date, to_date, len(chunk_bars), time.monotonic() - t0)
        return chunk_bars

    # All attempts failed with timeout
    raise ValueError(
        f"Market data request timed out for {symbol} ({from_date} → {to_date}) "
        f"after {_MAX_ATTEMPTS} attempts. "
        "The Polygon.io API may be slow right now, or the date range is unusually large. "
        "Try a shorter range or switch to a less frequent interval (e.g. 5m instead of 1m)."
    )


# ── Public API ─────────────────────────────────────────────────────────────────


def fetch_ohlc(
    symbol: str,
    interval: str,
    start: str | None,
    end: str | None,
    api_key: str,
) -> list[dict[str, Any]]:
    """
    Fetch adjusted OHLC bars from Polygon, automatically chunking the date range
    for high-frequency intervals so that each individual request is fast.

    Parameters
    ----------
    symbol   : frontend symbol string, e.g. "SPY" or "BTC/USDT"
    interval : frontend interval string, e.g. "1m", "1d"
    start    : ISO date "YYYY-MM-DD", or None (defaults to 2 years ago)
    end      : ISO date "YYYY-MM-DD", or None (defaults to today)
    api_key  : Polygon API key

    Returns
    -------
    List of bar dicts sorted oldest-first.

    Raises
    ------
    ValueError with a human-readable message on any failure.
    """
    if not api_key:
        raise ValueError(
            "POLYGON_API_KEY is not configured in the backend environment. "
            "Add it to backend/.env to enable live market data."
        )

    today     = datetime.now(timezone.utc).date()
    from_date = start or str(today - timedelta(days=730))
    to_date   = end   or str(today)

    ticker               = _resolve_ticker(symbol)
    multiplier, timespan = _resolve_interval(interval)
    chunk_days           = _CHUNK_DAYS.get(interval, 0)

    if chunk_days > 0:
        date_ranges = _date_chunks(from_date, to_date, chunk_days)
    else:
        date_ranges = [(from_date, to_date)]

    log.info("fetch_ohlc  symbol=%s  ticker=%s  interval=%s  %s → %s  chunks=%d",
             symbol, ticker, interval, from_date, to_date, len(date_ranges))

    all_raw: list[dict[str, Any]] = []
    for i, (chunk_from, chunk_to) in enumerate(date_ranges, 1):
        log.info("  chunk %d/%d  %s → %s", i, len(date_ranges), chunk_from, chunk_to)
        raw = _fetch_chunk(ticker, multiplier, timespan, chunk_from, chunk_to, api_key, symbol)
        all_raw.extend(raw)

    if not all_raw:
        raise ValueError(
            f"No market data found for {symbol} ({from_date} → {to_date}). "
            "Possible causes:\n"
            "• The symbol is not supported by your Polygon plan\n"
            "• The date range is entirely in the future or outside market hours\n"
            "• The selected interval is not available for this symbol\n"
            "Check your Polygon subscription tier and the symbol name."
        )

    bars: list[dict[str, Any]] = []
    for r in all_raw:
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
