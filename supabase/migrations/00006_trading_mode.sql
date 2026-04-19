-- ============================================================
-- 00006_trading_mode.sql
-- Stage 3: explicit trading mode per session, broker link,
-- and cached account fields for quick readiness checks.
--
-- Run in Supabase → SQL Editor.
-- ============================================================

-- ── 1. Trading mode on sessions ──────────────────────────────
--   paper     = pure simulation, no autotrading signals
--   shadow    = signals visible, no execution (Stage 2)
--   live_prep = full order preview + readiness checks, not executing (Stage 3)
--   live      = real execution (future)

ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS trading_mode TEXT NOT NULL DEFAULT 'paper'
    CHECK (trading_mode IN ('paper', 'shadow', 'live_prep', 'live'));

-- ── 2. Link a broker connection to a session ─────────────────
ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS broker_connection_id UUID
    REFERENCES broker_connections(id) ON DELETE SET NULL;

-- When live_prep mode was activated
ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS live_prep_enabled_at TIMESTAMPTZ;

-- ── 3. Cache live account data on broker_connections ─────────
--  Used for readiness checks without a fresh API call on every page load.
--  Populated by getBrokerLiveData() server action.

ALTER TABLE broker_connections
  ADD COLUMN IF NOT EXISTS cached_account_status TEXT;

ALTER TABLE broker_connections
  ADD COLUMN IF NOT EXISTS cached_equity NUMERIC(18,2);

ALTER TABLE broker_connections
  ADD COLUMN IF NOT EXISTS cached_buying_power NUMERIC(18,2);

ALTER TABLE broker_connections
  ADD COLUMN IF NOT EXISTS cached_positions_count INTEGER DEFAULT 0;
