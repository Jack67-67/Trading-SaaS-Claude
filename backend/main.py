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

If POLYGON_API_KEY is missing, the symbol is invalid, or the date range has no
data, the engine marks the run as "failed" with a clear error message so the
frontend can display the real reason instead of spinning forever.
"""

import asyncio
import base64
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("backtest")

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

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

# ── Rate limiter ──────────────────────────────────────────────────────────────


def _rate_limit_key(request: Request) -> str:
    """Use JWT sub as rate-limit key; fall back to IP if token is missing/unparseable."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        try:
            payload_b64 = token.split(".")[1]
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            if sub := payload.get("sub"):
                return f"user:{sub}"
        except Exception:
            pass
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    return f"ip:{ip}"


limiter = Limiter(key_func=_rate_limit_key)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Backtest Engine", version="0.2.0")
app.state.limiter = limiter

_frontend_url     = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_allowed_origins  = [o.strip() for o in _frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    return Response(
        content='{"detail": "Too many requests. Please wait and try again."}',
        status_code=429,
        media_type="application/json",
        headers={"Retry-After": "60"},
    )

# ── Schema ────────────────────────────────────────────────────────────────────


_VALID_INTERVALS = frozenset(
    {"1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"}
)
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_SYMBOL_RE = re.compile(r"^[A-Z0-9.\-]{1,10}$")


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
    commission_pct: float = 0.0
    slippage_pct:   float = 0.0

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        v = v.upper().strip()
        if not _SYMBOL_RE.match(v):
            raise ValueError("symbol must be 1–10 uppercase alphanumeric characters")
        return v

    @field_validator("interval")
    @classmethod
    def validate_interval(cls, v: str) -> str:
        if v not in _VALID_INTERVALS:
            raise ValueError(f"interval must be one of {sorted(_VALID_INTERVALS)}")
        return v

    @field_validator("start", "end")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _DATE_RE.match(v):
            raise ValueError("dates must be YYYY-MM-DD format")
        return v

    @field_validator("commission_pct", "slippage_pct")
    @classmethod
    def validate_fee(cls, v: float) -> float:
        if not (0.0 <= v <= 5.0):
            raise ValueError("fee percentages must be between 0 and 5")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("name must be 200 characters or fewer")
        return v


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


# ── Background task ───────────────────────────────────────────────────────────


BACKTEST_TIMEOUT_SECONDS = 300  # 5 minutes hard limit


async def _execute_backtest(payload: BacktestRunRequest, token: str) -> None:
    """
    Full backtest pipeline (runs as a FastAPI background task):
      1. Mark run as "running"
      2. Fetch strategy code from Supabase
      3. Fetch OHLC bars from Polygon
      4. Execute strategy via the backtest engine
      5. Write real results to Supabase → mark "completed"

    Hard-kills with a "failed" status after BACKTEST_TIMEOUT_SECONDS.
    All errors (data fetch, simulation, timeout) are written back to Supabase
    so the frontend can display the real reason instead of spinning forever.
    """
    run_id = payload.run_id

    try:
        await asyncio.wait_for(
            _run_pipeline(payload, token),
            timeout=BACKTEST_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        try:
            _patch_run(
                run_id,
                token,
                {
                    "status":        "failed",
                    "error_message": (
                        f"Backtest timed out after {BACKTEST_TIMEOUT_SECONDS // 60} minutes. "
                        "Try a shorter date range, a less frequent interval (e.g. 1d instead of 1m), "
                        "or simplify your strategy logic."
                    ),
                    "completed_at":  _now(),
                },
            )
        except Exception:
            pass
    except Exception as exc:
        try:
            _patch_run(
                run_id,
                token,
                {
                    "status":        "failed",
                    "error_message": str(exc),
                    "completed_at":  _now(),
                },
            )
        except Exception:
            pass


async def _run_pipeline(payload: BacktestRunRequest, token: str) -> None:
    """Inner pipeline — wrapped by _execute_backtest with a timeout."""
    run_id = payload.run_id

    pipeline_start = time.monotonic()
    log.info("[%s] pipeline start  symbol=%s interval=%s start=%s end=%s",
             run_id, payload.symbol, payload.interval, payload.start, payload.end)

    # ── 1. Mark running ───────────────────────────────────────────────────
    _patch_run(run_id, token, {"status": "running", "started_at": _now()})

    # ── 2. Fetch strategy code ────────────────────────────────────────────
    t0 = time.monotonic()
    strategy_code = _fetch_strategy_code(run_id, token)
    log.info("[%s] strategy fetch  %.2fs  code_len=%d",
             run_id, time.monotonic() - t0, len(strategy_code))

    # ── 3. Fetch OHLC data from Polygon ───────────────────────────────────
    t0 = time.monotonic()
    bars = await asyncio.to_thread(
        fetch_ohlc,
        payload.symbol,
        payload.interval,
        payload.start,
        payload.end,
        POLYGON_API_KEY,
    )
    log.info("[%s] data fetch      %.2fs  bars=%d",
             run_id, time.monotonic() - t0, len(bars))

    # ── 4. Run backtest engine ────────────────────────────────────────────
    t0 = time.monotonic()
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
    log.info("[%s] simulation      %.2fs  trades=%s",
             run_id, time.monotonic() - t0,
             results.get("total_trades", "?") if isinstance(results, dict) else "?")

    # ── 5. Write results ──────────────────────────────────────────────────
    t0 = time.monotonic()
    _patch_run(
        run_id,
        token,
        {
            "status":       "completed",
            "completed_at": _now(),
            "results":      results,
        },
    )
    log.info("[%s] db write        %.2fs", run_id, time.monotonic() - t0)
    log.info("[%s] pipeline done   total=%.2fs", run_id, time.monotonic() - pipeline_start)


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
    session_id:      str
    strategy_id:     str
    symbol:          str
    interval:        str
    start:           str
    params:          Dict[str, Any] = {}
    risk:            Dict[str, Any] = {}
    commission_pct:  float = 0.0
    slippage_pct:    float = 0.0
    initial_capital: float = 100_000.0

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        v = v.upper().strip()
        if not _SYMBOL_RE.match(v):
            raise ValueError("symbol must be 1–10 uppercase alphanumeric characters")
        return v

    @field_validator("interval")
    @classmethod
    def validate_interval(cls, v: str) -> str:
        if v not in _VALID_INTERVALS:
            raise ValueError(f"interval must be one of {sorted(_VALID_INTERVALS)}")
        return v

    @field_validator("start")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not _DATE_RE.match(v):
            raise ValueError("start must be YYYY-MM-DD format")
        return v

    @field_validator("commission_pct", "slippage_pct")
    @classmethod
    def validate_fee(cls, v: float) -> float:
        if not (0.0 <= v <= 5.0):
            raise ValueError("fee percentages must be between 0 and 5")
        return v

    @field_validator("initial_capital")
    @classmethod
    def validate_capital(cls, v: float) -> float:
        if not (100.0 <= v <= 100_000_000.0):
            raise ValueError("initial_capital must be between 100 and 100,000,000")
        return v


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
@limiter.limit("10/minute")
async def run_paper_trade_endpoint(
    request: Request,
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
@limiter.limit("5/minute")
async def run_backtest_endpoint(
    request: Request,
    payload: BacktestRunRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
) -> Dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    background_tasks.add_task(_execute_backtest, payload, token)
    return {"status": "accepted", "run_id": payload.run_id}
