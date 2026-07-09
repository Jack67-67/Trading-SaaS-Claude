"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BacktestRun, BacktestStatus } from "@/types";

interface UseBacktestRealtimeOptions {
  initialRun: BacktestRun;
  terminalStatuses?: BacktestStatus[];
}

interface UseBacktestRealtimeResult {
  run: BacktestRun;
  isLive: boolean;
  /** true when Supabase realtime is connected (instant updates); false = polling only */
  isRealtime: boolean;
  /** non-null only when a DB fetch actually fails */
  error: string | null;
  /** true when the run has been in-progress for >6 minutes without completing */
  timedOut: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_TERMINAL: BacktestStatus[] = ["completed", "failed", "cancelled"];
const POLL_MS = 3_500;
const TIMEOUT_MS = 6 * 60 * 1000;

/**
 * Polling-first hook: always polls every 3.5s while the run is active.
 * Supabase realtime is subscribed as a bonus for instant updates.
 * On CHANNEL_ERROR we silently fall back to polling — no error is shown.
 * A fetch error (DB unreachable) is the only thing that sets `error`.
 */
export function useBacktestRealtime({
  initialRun,
  terminalStatuses = DEFAULT_TERMINAL,
}: UseBacktestRealtimeOptions): UseBacktestRealtimeResult {
  const [run, setRun] = useState<BacktestRun>(initialRun);
  const [isRealtime, setIsRealtime] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Derive isLive from current run state so it's always in sync
  const isDone = terminalStatuses.includes(run.status);

  // Refs for mutable state — avoids stale closures in setInterval callbacks
  const isDoneRef = useRef(isDone);
  useEffect(() => { isDoneRef.current = isDone; }, [isDone]);

  const runRef = useRef(run);
  useEffect(() => { runRef.current = run; }, [run]);

  // Stable client reference — createBrowserClient returns a new object each call,
  // so we memoize it to avoid recreating `poll` on every render.
  const supabase = useMemo(() => createClient(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core poll function ───────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (isDoneRef.current) return;

    const { data, error } = await supabase
      .from("backtest_runs")
      .select("*")
      .eq("id", initialRun.id)
      .single();

    if (error) {
      setFetchError(error.message);
      return;
    }

    if (data) {
      const updated = data as unknown as BacktestRun;
      setRun(updated);
      setFetchError(null);
    }
  }, [initialRun.id, supabase]);

  // ── Always-on polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (isDone) return;

    // Poll immediately on mount to sync any updates that happened server-side
    poll();

    const timerId = setInterval(poll, POLL_MS);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── Realtime subscription (bonus — instant updates) ──────────────────────
  useEffect(() => {
    if (isDone) return;

    const channel = supabase
      .channel(`backtest-run-${initialRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "backtest_runs",
          filter: `id=eq.${initialRun.id}`,
        },
        (payload) => {
          const updated = payload.new as unknown as BacktestRun;
          setRun(updated);
          setFetchError(null);
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === "SUBSCRIBED");
        // CHANNEL_ERROR: silently continue polling — no error banner shown
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── Timeout ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDone) return;

    const timerId = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timerId);
  }, [isDone]);

  return {
    run,
    isLive: !isDone,
    isRealtime,
    error: fetchError,
    timedOut,
    refresh: poll,
  };
}
