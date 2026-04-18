-- ============================================================
-- 00004_autotrading.sql
-- Adds autotrading controls and safety limits to
-- paper_trade_sessions.
--
-- Run in Supabase → SQL Editor.
-- ============================================================

-- ── 1. Extend status to include 'stopped' ───────────────────
-- (stopped = kill switch activated; cannot restart without reset)
ALTER TABLE paper_trade_sessions
  DROP CONSTRAINT IF EXISTS paper_trade_sessions_status_check;

ALTER TABLE paper_trade_sessions
  ADD CONSTRAINT paper_trade_sessions_status_check
  CHECK (status IN ('active', 'paused', 'stopped', 'archived'));

-- ── 2. Autotrading flag ──────────────────────────────────────
ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS autotrading_enabled  boolean         NOT NULL DEFAULT false;

-- ── 3. Safety limits ─────────────────────────────────────────
ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS max_capital_pct      numeric(6,2)    NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_weekly_loss_pct  numeric(6,2)    NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_monthly_loss_pct numeric(6,2)    NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS pause_on_events      boolean         NOT NULL DEFAULT true;

-- ── 4. State / audit fields ──────────────────────────────────
ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS pause_reason   text,
  ADD COLUMN IF NOT EXISTS last_action    text,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;
