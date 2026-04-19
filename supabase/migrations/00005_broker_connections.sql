-- ============================================================
-- 00005_broker_connections.sql
-- Stores broker API credentials for read-only account access.
-- Stage 1: connection + display only. No order placement.
--
-- Run in Supabase → SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.broker_connections (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broker           TEXT        NOT NULL
    CHECK (broker IN ('alpaca_paper', 'alpaca_live')),
  api_key          TEXT        NOT NULL,
  api_secret       TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('connected', 'error', 'pending')),
  display_name     TEXT,
  account_number   TEXT,
  error_message    TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One connection per broker type per user
  UNIQUE (user_id, broker)
);

CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id
  ON public.broker_connections(user_id);

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own connections
CREATE POLICY "broker_connections_self"
  ON public.broker_connections FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
