-- Add results column to backtest_runs if not already present.
-- Run this if you applied 00001_initial_schema.sql before this fix.

ALTER TABLE public.backtest_runs
  ADD COLUMN IF NOT EXISTS results JSONB;
