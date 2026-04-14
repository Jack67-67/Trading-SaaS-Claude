"""
FastAPI backtest engine — Polygon integration.

Flow:
  1. POST /backtests/run  → accepts request, kicks off a background task, returns 202
  2. Background task      → marks run "running"
                         → fetches strategy code from Supabase
                         → fetches real OHLC data from Polygon
                         → executes strategy via the backtest engine
                         → writes real results to Supabase, marks "completed"
  3. Frontend             → picks up status changes via Supabase Realtime

Supabase writes use httpx directly against the PostgREST REST API.
We bypass supabase-py entirely because supabase-py 2.x rejects the new
"sb_publishable_" key format with "Invalid API key".

The user's Supabase JWT (Authorization header) is forwarded so RLS works
without needing a service-role key.

Fallback: if POLYGON_API_KEY is missing or symbol is unsupported, the engine
falls back to _stub_results() so the frontend never hard-errors.
"""

import asyncio
import os
import random
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_provider import fetch_ohlc
from backtest_engine import run_backtest

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL     = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
POLYGON_API_KEY  = os.environ.get("POLYGON_API_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env"
    )

POSTGREST_URL = f"{SUPABASE_URL}/rest/v1"

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Backtest Engine", version="0.2.0")

_frontend_url     = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_allowed_origins  = [o.strip() for o in _frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schema ────────────────────────────────────────────────────────────────────


class BacktestRunRequest(BaseModel):
    run_id:         str
    symbol:         str
    interval:       str
    start:          Optional[str] = None
    end:            Optional[str] = None
    entry:          Dict[str, Any] = {}
    risk:           Dict[str, Any] = {}
    params:         Dict[str, Any] = {}
    name:           str
    commission_pct: float = 0.0   # e.g. 0.1 means 0.1% per trade leg
    slippage_pct:   float = 0.0   # e.g. 0.05 means 0.05% one-way slippage


# ── Supabase PostgREST helpers ────────────────────────────────────────────────


def _supabase_headers(token: str) -> dict[str, str]:
    return {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }


def _patch_run(run_id: str, token: str, data: Dict[str, Any]) -> None:
    """PATCH a single backtest_runs row via PostgREST."""
    headers = {**_supabase_headers(token), "Prefer": "return=minimal"}
    url = f"{POSTGREST_URL}/backtest_runs?id=eq.{run_id}"
    response = httpx.patch(url, json=data, headers=headers, timeout=10)
    response.raise_for_status()


def _fetch_strategy_code(run_id: str, token: str) -> str:
    """
    Look up the strategy code for a given run_id.

    1. GET backtest_runs → config.strategy_id
    2. GET strategies    → code
    """
    headers = _supabase_headers(token)

    # Step 1: get strategy_id from run config
    r = httpx.get(
        f"{POSTGREST_URL}/backtest_runs?id=eq.{run_id}&select=config",
        headers=headers,
        timeout=10,
    )
    r.raise_for_status()
    rows = r.json()
    if not rows:
        raise ValueError(f"Run {run_id} not found in Supabase.")

    config = rows[0].get("config") or {}
    strategy_id = config.get("strategy_id")
    if not strategy_id:
        raise ValueError(
            "No strategy_id in run config — cannot fetch strategy code."
        )

    # Step 2: get code from strategies table
    r = httpx.get(
        f"{POSTGREST_URL}/strategies?id=eq.{strategy_id}&select=code",
        headers=headers,
        timeout=10,
    )
    r.raise_for_status()
    strategies = r.json()
    if not strategies:
        raise ValueError(f"Strategy {strategy_id} not found in Supabase.")

    code = strategies[0].get("code", "").strip()
    if not code:
        raise ValueError(
            f"Strategy {strategy_id} has no code saved. "
            "Open the strategy editor and save code before running a backtest."
        )

    return code


# ── Stub fallback ─────────────────────────────────────────────────────────────


def _stub_results(symbol: str) -> Dict[str, Any]:
    """
    Deterministic dummy results used as a fallback when real data is unavailable.
    Replace this only if you want to remove stub support entirely.
    """
    rng = random.Random(symbol)

    total_return = round(rng.uniform(-15, 45), 2)
    n_trades     = rng.randint(20, 120)
    win_rate     = round(rng.uniform(40, 70), 1)
    max_dd       = round(rng.uniform(3, 25), 2)

    equity       = 100_000.0
    equity_curve = []
    for i in range(52):
        equity *= 1 + rng.uniform(-0.03, 0.035)
        equity_curve.append(
            {
                "timestamp":    f"2024-{(i // 4) + 1:02d}-{((i % 4) * 7) + 1:02d}",
                "equity":       round(equity, 2),
                "drawdown_pct": round(rng.uniform(0, max_dd), 2),
            }
        )

    return {
        "metrics": {
            "total_return_pct":       total_return,
            "annualized_return_pct":  round(total_return * 0.52, 2),
            "sharpe_ratio":           round(rng.uniform(0.4, 2.2), 2),
            "sortino_ratio":          round(rng.uniform(0.6, 2.8), 2),
            "max_drawdown_pct":       max_dd,
            "win_rate_pct":           win_rate,
            "profit_factor":          round(rng.uniform(0.9, 2.5), 2),
            "total_trades":           n_trades,
            "avg_trade_return_pct":   round(total_return / n_trades, 3),
            "max_consecutive_wins":   rng.randint(3, 12),
            "max_consecutive_losses": rng.randint(2, 8),
            "calmar_ratio":           round(total_return / max_dd, 2),
            "volatility_pct":         round(rng.uniform(8, 28), 1),
        },
        "equity_curve": equity_curve,
        "trades": [],
    }


# ── Background task ───────────────────────────────────────────────────────────


async def _execute_backtest(payload: BacktestRunRequest, token: str) -> None:
    """
    Full backtest pipeline (runs as a FastAPI background task):
      1. Mark run as "running"
      2. Fetch strategy code from Supabase
      3. Fetch OHLC bars from Polygon
      4. Execute strategy via the backtest engine
      5. Write real results to Supabase → mark "completed"

    Falls back to stub results if Polygon data is unavailable.
    """
    run_id = payload.run_id

    try:
        # ── 1. Mark running ───────────────────────────────────────────────────
        _patch_run(run_id, token, {"status": "running", "started_at": _now()})

        # ── 2. Fetch strategy code ────────────────────────────────────────────
        strategy_code = _fetch_strategy_code(run_id, token)

        # ── 3. Fetch OHLC data from Polygon ───────────────────────────────────
        bars = await asyncio.to_thread(
            fetch_ohlc,
            payload.symbol,
            payload.interval,
            payload.start,
            payload.end,
            POLYGON_API_KEY,
        )

        # ── 4. Run backtest engine ────────────────────────────────────────────
        results = await asyncio.to_thread(
            run_backtest,
            strategy_code,
            bars,
            payload.params,
            payload.risk,
            100_000.0,
            payload.commission_pct,
            payload.slippage_pct,
        )

        # ── 5. Write results ──────────────────────────────────────────────────
        _patch_run(
            run_id,
            token,
            {
                "status":       "completed",
                "completed_at": _now(),
                "results":      results,
            },
        )

    except Exception as exc:
        # Best-effort: write the error back so the frontend can display it
        error_msg = str(exc)
        try:
            _patch_run(
                run_id,
                token,
                {
                    "status":        "failed",
                    "error_message": error_msg,
                    "completed_at":  _now(),
                },
            )
        except Exception:
            pass


# ── Routes ────────────────────────────────────────────────────────────────────


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health")
def health() -> Dict[str, str]:
    polygon_status = "configured" if POLYGON_API_KEY else "missing"
    return {
        "status":          "ok",
        "version":         "0.2.0",
        "polygon":         polygon_status,
    }


class PaperTradeRunRequest(BaseModel):
    session_id:     str
    strategy_id:    str
    symbol:         str
    interval:       str
    start:          str          # ISO date, e.g. "2024-01-01"
    params:         Dict[str, Any] = {}
    risk:           Dict[str, Any] = {}
    commission_pct: float = 0.0
    slippage_pct:   float = 0.0
    initial_capital: float = 100_000.0


def _patch_session(session_id: str, token: str, data: Dict[str, Any]) -> None:
    """PATCH a single paper_trade_sessions row via PostgREST."""
    headers = {**_supabase_headers(token), "Prefer": "return=minimal"}
    url = f"{POSTGREST_URL}/paper_trade_sessions?id=eq.{session_id}"
    response = httpx.patch(url, json=data, headers=headers, timeout=10)
    response.raise_for_status()


def _fetch_strategy_code_by_id(strategy_id: str, token: str) -> str:
    """Fetch strategy code directly by strategy ID."""
    headers = _supabase_headers(token)
    r = httpx.get(
        f"{POSTGREST_URL}/strategies?id=eq.{strategy_id}&select=code",
        headers=headers,
        timeout=10,
    )
    r.raise_for_status()
    strategies = r.json()
    if not strategies:
        raise ValueError(f"Strategy {strategy_id} not found.")
    code = strategies[0].get("code", "").strip()
    if not code:
        raise ValueError(f"Strategy {strategy_id} has no code saved.")
    return code


def _execute_paper_trade_sync(payload: PaperTradeRunRequest, token: str) -> Dict[str, Any]:
    """
    Run paper trade synchronously (end=today).
    Returns results dict on success, raises on error.
    """
    from datetime import date

    end_date = date.today().isoformat()

    strategy_code = _fetch_strategy_code_by_id(payload.strategy_id, token)

    bars = fetch_ohlc(
        payload.symbol,
        payload.interval,
        payload.start,
        end_date,
        POLYGON_API_KEY,
    )

    results = run_backtest(
        strategy_code,
        bars,
        payload.params,
        payload.risk,
        payload.initial_capital,
        payload.commission_pct,
        payload.slippage_pct,
    )
    return results


@app.post("/paper-trade/run")
async def run_paper_trade_endpoint(
    payload: PaperTradeRunRequest,
    authorization: str = Header(...),
) -> Dict[str, Any]:
    """
    Synchronous paper-trade refresh. Runs strategy from start_date to today,
    then patches last_results + last_refreshed_at on the session row.
    Returns full results so the frontend can update immediately.
    """
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        results = await asyncio.to_thread(_execute_paper_trade_sync, payload, token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Persist to Supabase
    try:
        _patch_session(
            payload.session_id,
            token,
            {
                "last_results":      results,
                "last_refreshed_at": _now(),
                "status":            "active",
            },
        )
    except Exception:
        pass  # Don't fail the response if caching fails

    return {"results": results, "refreshed_at": _now()}


@app.post("/backtests/run", status_code=202)
async def run_backtest_endpoint(
    payload: BacktestRunRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
) -> Dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    background_tasks.add_task(_execute_backtest, payload, token)
    return {"status": "accepted", "run_id": payload.run_id}
