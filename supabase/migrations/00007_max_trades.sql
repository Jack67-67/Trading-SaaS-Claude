-- ============================================================
-- 00007_max_trades.sql
-- Adds max_daily_trades safety limit to paper_trade_sessions.
-- Run in Supabase → SQL Editor.
-- ============================================================

ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS max_daily_trades integer NOT NULL DEFAULT 10;
