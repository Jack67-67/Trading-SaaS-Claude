"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BacktestRun, BacktestStatus } from "@/types";

interface UseBacktestRealtimeOptions {
  initialRun: BacktestRun;
  terminalStatuses?: BacktestStatus[];
}

interface UseBacktestRealtimeResult {
  run: BacktestRun;
  isLive: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_TERMINAL: BacktestStatus[] = ["completed", "failed", "cancelled"];

/**
 * Subscribes to Supabase realtime updates on a specific backtest_runs row.
 * The FastAPI backend writes status/results directly to Supabase,
 * and this hook picks up those changes in real time.
 */
export function useBacktestRealtime({
  initialRun,
  terminalStatuses = DEFAULT_TERMINAL,
}: UseBacktestRealtimeOptions): UseBacktestRealtimeResult {
  const [run, setRun] = useState<BacktestRun>(initialRun);
  const [isLive, setIsLive] = useState(
    !terminalStatuses.includes(initialRun.status)
  );
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("backtest_runs")
      .select("*")
      .eq("id", initialRun.id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    if (data) {
      const updated = data as unknown as BacktestRun;
      setRun(updated);
      setError(null);
      if (terminalStatuses.includes(updated.status)) {
        setIsLive(false);
      }
    }
  }, [initialRun.id, supabase, terminalStatuses]);

  useEffect(() => {
    if (!isLive) return;

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
          setError(null);
          if (terminalStatuses.includes(updated.status)) {
            setIsLive(false);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Realtime connection error. Try refreshing.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialRun.id, isLive, supabase, terminalStatuses]);

  return { run, isLive, error, refresh };
}
