import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Plus, TrendingUp, TrendingDown, Minus, Pause, ShieldX, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPercent, pnlColor } from "@/lib/utils";

export const metadata: Metadata = { title: "Autotrading" };

function DbErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-loss/40 bg-loss/5 px-5 py-4 space-y-2">
      <p className="text-xs font-bold text-loss uppercase tracking-wider">Database error</p>
      <p className="text-xs font-mono text-text-secondary break-all">{message}</p>
      <div className="pt-1 space-y-1">
        <p className="text-2xs text-text-muted">
          The autotrading columns may not exist yet. Run the migration below in{" "}
          <strong className="text-text-secondary">Supabase → SQL Editor</strong>:
        </p>
        <pre className="text-2xs font-mono bg-surface-3 border border-border rounded-lg px-4 py-3 overflow-x-auto leading-relaxed whitespace-pre">{MIGRATION_SQL}</pre>
      </div>
    </div>
  );
}

const MIGRATION_SQL = `-- 00004_autotrading.sql
-- Run this in Supabase → SQL Editor

ALTER TABLE paper_trade_sessions
  DROP CONSTRAINT IF EXISTS paper_trade_sessions_status_check;

ALTER TABLE paper_trade_sessions
  ADD CONSTRAINT paper_trade_sessions_status_check
  CHECK (status IN ('active', 'paused', 'stopped', 'archived'));

ALTER TABLE paper_trade_sessions
  ADD COLUMN IF NOT EXISTS autotrading_enabled  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_capital_pct      numeric(6,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_weekly_loss_pct  numeric(6,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_monthly_loss_pct numeric(6,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS pause_on_events      boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pause_reason         text,
  ADD COLUMN IF NOT EXISTS last_action          text,
  ADD COLUMN IF NOT EXISTS last_action_at       timestamptz;`;

export default async function AutotradingPage() {
  let renderError: string | null = null;

  type SessionRow = {
    id: string; name: string; symbol: string; interval: string;
    status: string; last_results: unknown; last_refreshed_at: string | null;
    autotrading_enabled: boolean; pause_reason: string | null;
  };
  let sessions: SessionRow[] = [];

  try {
    const supabase = createClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) console.error("[autotrading/list] auth error:", authErr.message);
    if (!user) redirect("/auth/login");

    const { data, error } = await supabase
      .from("paper_trade_sessions")
      .select("id, name, symbol, interval, status, last_results, last_refreshed_at, autotrading_enabled, pause_reason")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }) as unknown as {
        data: SessionRow[] | null;
        error: { message: string; code?: string } | null;
      };

    if (error) {
      renderError = `${error.code ?? "DB_ERROR"}: ${error.message}`;
    } else {
      sessions = data ?? [];
    }
  } catch (e) {
    if (e != null && typeof e === "object" && "digest" in e) throw e;
    renderError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Bot size={18} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Automatic</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Autotrading</h1>
          <p className="text-sm text-text-secondary mt-1">
            Attach safety controls and automated rules to any paper trading session.
          </p>
        </div>
        <Link
          href="/dashboard/paper-trading/new"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} />
          New Session
        </Link>
      </div>

      {renderError && <DbErrorBanner message={renderError} />}

      {/* ── How it works ───────────────────────────────────────────────────── */}
      {!renderError && (
        <div className="rounded-xl border border-accent/15 bg-accent/[0.03] px-5 py-4 flex items-start gap-3">
          <Bot size={14} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-primary">How autotrading works</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Autotrading monitors your paper sessions and automatically pauses them when safety
              limits are breached — weekly or monthly loss caps, or major market events (FOMC, CPI, NFP).
              Select a session below to configure its controls.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!renderError && sessions.length === 0 && (
        <div className="rounded-2xl border border-border border-dashed bg-surface-1 px-8 py-14 text-center">
          <Bot size={32} className="mx-auto text-text-muted/30 mb-4" />
          <p className="text-sm font-semibold text-text-secondary mb-1">No paper trading sessions yet</p>
          <p className="text-xs text-text-muted mb-5 max-w-xs mx-auto">
            Create a paper trading session first, then configure autotrading controls for it here.
          </p>
          <Link
            href="/dashboard/paper-trading/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            <Plus size={13} />
            Create Session
          </Link>
        </div>
      )}

      {/* ── Session list ───────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const results = sess.last_results as Record<string, unknown> | null;
            const metrics = results?.metrics as { total_return_pct?: number } | undefined;
            const returnPct: number | null = metrics?.total_return_pct ?? null;

            const isStopped = sess.status === "stopped";
            const isPaused  = sess.status === "paused";
            const isAuto    = Boolean(sess.autotrading_enabled) && !isStopped;

            return (
              <Link
                key={sess.id}
                href={`/dashboard/autotrading/${sess.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface-1 px-5 py-4 hover:bg-surface-2 transition-colors group"
              >
                {/* Autotrading status indicator */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  isStopped ? "bg-loss/10"
                    : isPaused  ? "bg-amber-500/10"
                    : isAuto    ? "bg-profit/10"
                    : "bg-surface-3"
                )}>
                  {isStopped ? <ShieldX size={14} className="text-loss" />
                    : isPaused  ? <Pause   size={14} className="text-amber-400" />
                    : isAuto    ? <Bot     size={14} className="text-profit" />
                    : <Activity  size={14} className="text-text-muted" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                      {sess.name}
                    </p>
                    {isStopped && (
                      <span className="text-2xs font-semibold text-loss bg-loss/10 border border-loss/20 rounded-full px-2 py-0.5">Stopped</span>
                    )}
                    {isPaused && !isStopped && (
                      <span className="text-2xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">Paused</span>
                    )}
                    {isAuto && (
                      <span className="text-2xs font-semibold text-profit bg-profit/10 border border-profit/20 rounded-full px-2 py-0.5">Auto ON</span>
                    )}
                    {!isAuto && !isStopped && !isPaused && (
                      <span className="text-2xs text-text-muted/50 bg-surface-3 border border-border rounded-full px-2 py-0.5">Auto OFF</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.symbol}</span>
                    <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">{sess.interval}</span>
                    {isPaused && sess.pause_reason && (
                      <span className="text-2xs text-text-muted/60 truncate">{sess.pause_reason}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {returnPct !== null ? (
                    <>
                      <p className="text-2xs text-text-muted">Return</p>
                      <p className={cn("text-sm font-mono font-bold tabular-nums", pnlColor(returnPct))}>
                        {formatPercent(returnPct)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted/40">No data</p>
                  )}
                </div>

                <div className="shrink-0">
                  {returnPct === null ? (
                    <Minus size={14} className="text-text-muted/30" />
                  ) : returnPct > 0.5 ? (
                    <TrendingUp size={14} className="text-profit" />
                  ) : returnPct < -0.5 ? (
                    <TrendingDown size={14} className="text-loss" />
                  ) : (
                    <Minus size={14} className="text-text-muted/30" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
