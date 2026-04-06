"""
Stub FastAPI backtest engine.

Flow:
  1. POST /backtests/run  → accepts request, kicks off a background task, returns 202
  2. Background task      → marks run "running", sleeps 3s, writes dummy results, marks "completed"
  3. Frontend             → picks up status changes via Supabase Realtime

Supabase writes use httpx directly against the PostgREST REST API.
We bypass supabase-py entirely because supabase-py 2.x rejects the new
"sb_publishable_" key format with "Invalid API key".

The user's Supabase JWT (Authorization header) is forwarded so RLS works
without needing a service-role key.

To swap in real logic, replace _stub_results() and the sleep in _execute_backtest().
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

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env"
    )

POSTGREST_URL = f"{SUPABASE_URL}/rest/v1"

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Backtest Engine (stub)", version="0.1.0")

_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schema ────────────────────────────────────────────────────────────────────


class BacktestRunRequest(BaseModel):
    run_id: str
    symbol: str
    interval: str
    start: Optional[str] = None
    end: Optional[str] = None
    entry: Dict[str, Any] = {}
    risk: Dict[str, Any] = {}
    params: Dict[str, Any] = {}
    name: str


# ── Supabase PostgREST helper ─────────────────────────────────────────────────


def _patch_run(run_id: str, user_token: str, data: Dict[str, Any]) -> None:
    """
    PATCH a single backtest_runs row via the Supabase PostgREST REST API.
    Uses the user's JWT so RLS (auth.uid() = user_id) is satisfied.
    """
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    url = f"{POSTGREST_URL}/backtest_runs?id=eq.{run_id}"
    response = httpx.patch(url, json=data, headers=headers, timeout=10)
    response.raise_for_status()


# ── Helpers ───────────────────────────────────────────────────────────────────


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stub_results(symbol: str) -> Dict[str, Any]:
    """
    Return plausible-looking dummy metrics.
    Replace this function body with real backtest output.
    """
    rng = random.Random(symbol)  # deterministic per symbol for reproducibility

    total_return = round(rng.uniform(-15, 45), 2)
    n_trades = rng.randint(20, 120)
    win_rate = round(rng.uniform(40, 70), 1)
    max_dd = round(rng.uniform(3, 25), 2)

    # Synthetic equity curve: 52 weekly data points
    equity = 100_000.0
    equity_curve = []
    for i in range(52):
        equity *= 1 + rng.uniform(-0.03, 0.035)
        equity_curve.append(
            {
                "timestamp": f"2024-{(i // 4) + 1:02d}-{((i % 4) * 7) + 1:02d}",
                "equity": round(equity, 2),
                "drawdown_pct": round(rng.uniform(0, max_dd), 2),
            }
        )

    return {
        "metrics": {
            "total_return_pct": total_return,
            "annualized_return_pct": round(total_return * 0.52, 2),
            "sharpe_ratio": round(rng.uniform(0.4, 2.2), 2),
            "sortino_ratio": round(rng.uniform(0.6, 2.8), 2),
            "max_drawdown_pct": max_dd,
            "win_rate_pct": win_rate,
            "profit_factor": round(rng.uniform(0.9, 2.5), 2),
            "total_trades": n_trades,
            "avg_trade_return_pct": round(total_return / n_trades, 3),
            "max_consecutive_wins": rng.randint(3, 12),
            "max_consecutive_losses": rng.randint(2, 8),
            "calmar_ratio": round(total_return / max_dd, 2),
            "volatility_pct": round(rng.uniform(8, 28), 1),
        },
        "equity_curve": equity_curve,
        "trades": [],
    }


# ── Background task ───────────────────────────────────────────────────────────


async def _execute_backtest(payload: BacktestRunRequest, token: str) -> None:
    """
    Runs (or stubs) a backtest and writes results back to Supabase.
    Runs as a FastAPI background task so the HTTP response returns immediately.
    """
    run_id = payload.run_id

    try:
        # 1. Mark as running
        _patch_run(run_id, token, {"status": "running", "started_at": _now()})

        # 2. Simulate work (replace with real engine call)
        await asyncio.sleep(3)

        # 3. Build results
        results = _stub_results(payload.symbol)

        # 4. Mark as completed with results
        _patch_run(
            run_id,
            token,
            {
                "status": "completed",
                "completed_at": _now(),
                "results": results,
            },
        )

    except Exception as exc:
        # Best-effort: write the error back so the frontend can display it
        try:
            _patch_run(
                run_id,
                token,
                {
                    "status": "failed",
                    "error_message": str(exc),
                    "completed_at": _now(),
                },
            )
        except Exception:
            pass


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "version": "0.1.0-stub"}


@app.post("/backtests/run", status_code=202)
async def run_backtest(
    payload: BacktestRunRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
) -> Dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    background_tasks.add_task(_execute_backtest, payload, token)
    return {"status": "accepted", "run_id": payload.run_id}
