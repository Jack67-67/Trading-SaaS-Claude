-- Migration: add config column to strategies table
-- Run this in the Supabase SQL editor or via supabase db push
--
-- The config column stores self-contained strategy defaults:
-- symbol, execution_interval, analysis_interval, commission_pct, slippage_pct, initial_capital
-- These auto-fill backtests, paper trading sessions, and autotrading sessions.

ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT NULL;

COMMENT ON COLUMN strategies.config IS
  'Self-contained strategy configuration. Fields: symbol, execution_interval, analysis_interval, commission_pct, slippage_pct, initial_capital. Auto-fills backtests and paper/auto sessions.';
