-- ============================================================
-- 00008_portfolio_execution.sql
-- Adds autotrading portfolios and execution order tracking.
-- Run in Supabase → SQL Editor.
-- ============================================================

-- ── 1. Portfolio (one per user) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autotrading_portfolios (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                      text NOT NULL DEFAULT 'My Portfolio',

  -- Portfolio-level risk controls
  max_portfolio_risk_pct    numeric(6,2)  NOT NULL DEFAULT 5,
  max_risk_per_strategy_pct numeric(6,2)  NOT NULL DEFAULT 2,
  max_simultaneous_trades   integer       NOT NULL DEFAULT 5,
  max_weekly_loss_pct       numeric(6,2)  NOT NULL DEFAULT 10,
  max_monthly_loss_pct      numeric(6,2)  NOT NULL DEFAULT 20,
  pause_on_events           boolean       NOT NULL DEFAULT true,

  -- State
  status                    text          NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'stopped')),
  pause_reason              text,
  kill_switch_at            timestamptz,

  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE autotrading_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_portfolios" ON autotrading_portfolios
  FOR ALL USING (auth.uid() = user_id);

-- ── 2. Link sessions to portfolio ────────────────────────────────────────────
ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS portfolio_id uuid
    REFERENCES autotrading_portfolios(id) ON DELETE SET NULL;

-- ── 3. Execution orders (full audit trail) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id       uuid NOT NULL REFERENCES paper_trade_sessions(id) ON DELETE CASCADE,
  portfolio_id     uuid REFERENCES autotrading_portfolios(id) ON DELETE SET NULL,

  -- Instrument
  symbol           text NOT NULL,
  direction        text NOT NULL CHECK (direction IN ('long', 'short')),

  -- Order params
  order_type       text NOT NULL DEFAULT 'market'
    CHECK (order_type IN ('market', 'limit', 'stop_limit')),
  qty              numeric(18,6) NOT NULL,
  limit_price      numeric(18,6),

  -- Risk params
  entry_price      numeric(18,6),
  stop_loss        numeric(18,6),
  take_profit      numeric(18,6),
  risk_amount      numeric(18,6),
  risk_pct         numeric(8,4),

  -- Signal context (the "why")
  strategy_name    text,
  signal_reason    text,
  confidence       text CHECK (confidence IN ('low', 'medium', 'high')),
  trading_mode     text NOT NULL DEFAULT 'paper'
    CHECK (trading_mode IN ('paper', 'shadow', 'live_prep', 'live')),

  -- Execution state
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'filled', 'partial',
                      'cancelled', 'failed', 'simulated')),
  broker_order_id  text,
  filled_price     numeric(18,6),
  filled_qty       numeric(18,6),
  commission       numeric(18,6) DEFAULT 0,
  failure_reason   text,

  -- Close (when trade exits)
  close_price      numeric(18,6),
  close_reason     text CHECK (close_reason IN (
    'stop_loss', 'take_profit', 'signal_reversed', 'manual',
    'kill_switch', 'event_guard', 'loss_limit', 'daily_limit',
    'session_ended', 'timeout'
  )),
  pnl              numeric(18,6),
  pnl_pct          numeric(8,4),

  -- Timing
  signal_at        timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz,
  filled_at        timestamptz,
  closed_at        timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS execution_orders_session_idx  ON execution_orders(session_id);
CREATE INDEX IF NOT EXISTS execution_orders_user_idx     ON execution_orders(user_id);
CREATE INDEX IF NOT EXISTS execution_orders_status_idx   ON execution_orders(status);
CREATE INDEX IF NOT EXISTS execution_orders_created_idx  ON execution_orders(created_at DESC);

ALTER TABLE execution_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_orders" ON execution_orders
  FOR ALL USING (auth.uid() = user_id);
