"use client";

import { useState, useTransition } from "react";
import {
  Bot, ShieldCheck, ShieldX, Pause, Play, Zap, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle2, Info, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleAutotrading,
  updateSafetyControls,
  pauseSession,
  resumeSession,
  killSwitch,
} from "@/app/actions/autotrading";
import {
  generateAutotradingRecommendations,
  type AutotradingMetrics,
  type AutotradingRecommendation,
} from "@/lib/autotrading-ai";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AutotradingControlCenterProps {
  sessionId: string;
  status: string;
  autotradingEnabled: boolean;
  pauseReason: string | null;
  lastAction: string | null;
  lastActionAt: string | null;
  maxCapitalPct: number;
  maxWeeklyLossPct: number;
  maxMonthlyLossPct: number;
  pauseOnEvents: boolean;
  metrics: AutotradingMetrics | null;
  weeklyLossPct: number | null;
  monthlyLossPct: number | null;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function lastActionLabel(action: string | null): string {
  if (!action) return "—";
  const labels: Record<string, string> = {
    autotrading_on:   "Autotrading enabled",
    autotrading_off:  "Autotrading disabled",
    controls_updated: "Safety controls updated",
    paused:           "Session paused",
    resumed:          "Session resumed",
    kill_switch:      "Kill switch activated",
  };
  return labels[action] ?? action;
}

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Recommendation row ────────────────────────────────────────────────────────

function RecRow({ rec }: { rec: AutotradingRecommendation }) {
  const isOk = rec.severity === "ok";
  const isWarn = rec.severity === "warning";
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 border-b border-border/60 last:border-0",
    )}>
      <div className="mt-0.5 shrink-0">
        {isOk
          ? <CheckCircle2 size={13} className="text-profit" />
          : isWarn
          ? <AlertTriangle size={13} className="text-amber-400" />
          : <Info size={13} className="text-accent" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-semibold",
          isOk ? "text-profit" : isWarn ? "text-amber-300" : "text-text-primary"
        )}>
          {rec.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{rec.body}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AutotradingControlCenter(props: AutotradingControlCenterProps) {
  const {
    sessionId, status, autotradingEnabled, pauseReason,
    lastAction, lastActionAt,
    maxCapitalPct: initCapital,
    maxWeeklyLossPct: initWeekly,
    maxMonthlyLossPct: initMonthly,
    pauseOnEvents: initPauseOnEvents,
    metrics, weeklyLossPct, monthlyLossPct,
  } = props;

  const [isPending, startTransition] = useTransition();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [killConfirm, setKillConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Safety controls form state
  const [capital, setCapital] = useState(initCapital);
  const [weekly, setWeekly] = useState(initWeekly);
  const [monthly, setMonthly] = useState(initMonthly);
  const [pauseEvt, setPauseEvt] = useState(initPauseOnEvents);

  const isStopped = status === "stopped";
  const isPaused = status === "paused";
  const isActive = status === "active";

  // AI recommendations
  const recommendations = metrics
    ? generateAutotradingRecommendations(metrics, {
        weeklyLossPct,
        monthlyLossPct,
        maxWeeklyLossPct: initWeekly,
        maxMonthlyLossPct: initMonthly,
      })
    : [];

  function act(fn: () => Promise<{ error: string } | undefined>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setActionError(result.error);
    });
  }

  // ── Status banner ─────────────────────────────────────────────────────────

  const statusBanner = isStopped ? (
    <div className="flex items-center gap-3 px-4 py-3 bg-loss/[0.06] border-b border-loss/20">
      <ShieldX size={14} className="text-loss shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-loss">Session stopped — kill switch activated</p>
        <p className="text-xs text-text-muted/70 mt-0.5">This session cannot be restarted. Create a new session to continue.</p>
      </div>
    </div>
  ) : isPaused ? (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/[0.06] border-b border-amber-500/20">
      <Pause size={14} className="text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-300">Session paused</p>
        {pauseReason && <p className="text-xs text-text-muted/70 mt-0.5">{pauseReason}</p>}
      </div>
      <button
        disabled={isPending}
        onClick={() => act(() => resumeSession(sessionId))}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-50"
      >
        <Play size={11} />
        Resume
      </button>
    </div>
  ) : autotradingEnabled ? (
    <div className="flex items-center gap-3 px-4 py-3 bg-profit/[0.04] border-b border-profit/15">
      <Bot size={14} className="text-profit shrink-0" />
      <p className="text-xs font-semibold text-profit flex-1">Autotrading active — safety checks running on each refresh</p>
    </div>
  ) : (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-2/50 border-b border-border">
      <ShieldCheck size={14} className="text-text-muted shrink-0" />
      <p className="text-xs text-text-muted flex-1">Manual mode — autotrading is off</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-surface-1 border-b border-border">
        <Bot size={15} className="text-accent shrink-0" />
        <p className="text-sm font-semibold text-text-primary flex-1">Autotrading Control</p>
        {lastAction && lastActionAt && (
          <div className="flex items-center gap-1 text-2xs text-text-muted/50">
            <Clock size={9} />
            <span>{lastActionLabel(lastAction)} · {timeAgoShort(lastActionAt)}</span>
          </div>
        )}
      </div>

      {/* ── Status banner ──────────────────────────────────────────────────── */}
      {statusBanner}

      {/* ── Toggle row (disabled when stopped) ────────────────────────────── */}
      {!isStopped && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-text-primary">Enable autotrading</p>
            <p className="text-xs text-text-muted mt-0.5">
              Safety checks run automatically after each refresh.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={autotradingEnabled}
            disabled={isPending || isPaused}
            onClick={() => act(() => toggleAutotrading(sessionId, !autotradingEnabled))}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              autotradingEnabled ? "bg-profit" : "bg-surface-3"
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform",
              autotradingEnabled ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
        </div>
      )}

      {/* ── Safety controls ────────────────────────────────────────────────── */}
      {!isStopped && (
        <div className="border-b border-border">
          <button
            onClick={() => setControlsOpen((v) => !v)}
            className="flex items-center justify-between w-full px-5 py-3 hover:bg-surface-2/40 transition-colors text-left"
          >
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Safety Limits
            </span>
            {controlsOpen
              ? <ChevronUp size={13} className="text-text-muted" />
              : <ChevronDown size={13} className="text-text-muted" />}
          </button>

          {controlsOpen && (
            <div className="px-5 pb-5 space-y-4 bg-surface-0/50">

              <NumericField
                label="Capital allocation"
                unit="%"
                value={capital}
                onChange={setCapital}
                min={1} max={100}
                hint="Percentage of portfolio allocated to this session"
              />

              <NumericField
                label="Max weekly loss"
                unit="%"
                value={weekly}
                onChange={setWeekly}
                min={1} max={50}
                hint="Auto-pause if the session loses more than this % in 7 days"
              />

              <NumericField
                label="Max monthly loss"
                unit="%"
                value={monthly}
                onChange={setMonthly}
                min={1} max={80}
                hint="Auto-pause if the session loses more than this % in 30 days"
              />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-text-primary">Pause on major events</p>
                  <p className="text-xs text-text-muted mt-0.5">Auto-pause when FOMC, CPI, or NFP is today</p>
                </div>
                <button
                  role="switch"
                  aria-checked={pauseEvt}
                  onClick={() => setPauseEvt((v) => !v)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    pauseEvt ? "bg-accent" : "bg-surface-3"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                    pauseEvt ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>
              </div>

              <button
                disabled={isPending}
                onClick={() => act(() => updateSafetyControls(sessionId, {
                  maxCapitalPct: capital,
                  maxWeeklyLossPct: weekly,
                  maxMonthlyLossPct: monthly,
                  pauseOnEvents: pauseEvt,
                }))}
                className="w-full rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold py-2 hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save limits"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── AI recommendations ─────────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div className="border-b border-border">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <Zap size={12} className="text-accent" />
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">AI Recommendations</p>
          </div>
          <div className="bg-surface-0">
            {recommendations.map((rec) => (
              <RecRow key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* ── Manual controls (pause / kill switch) ─────────────────────────── */}
      {!isStopped && (
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          {isActive && (
            <button
              disabled={isPending}
              onClick={() => act(() => pauseSession(sessionId, "Manually paused"))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              <Pause size={11} />
              Pause session
            </button>
          )}

          <div className="ml-auto">
            {!killConfirm ? (
              <button
                disabled={isPending}
                onClick={() => setKillConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-loss/30 bg-loss/[0.04] px-3 py-2 text-xs font-semibold text-loss/70 hover:text-loss hover:border-loss/50 hover:bg-loss/[0.08] transition-colors disabled:opacity-50"
              >
                <ShieldX size={11} />
                Kill switch
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xs text-loss/80">Permanently stop? Cannot undo.</p>
                <button
                  disabled={isPending}
                  onClick={() => { setKillConfirm(false); act(() => killSwitch(sessionId)); }}
                  className="rounded-lg bg-loss px-3 py-2 text-xs font-bold text-white hover:bg-loss/80 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Stopping…" : "Confirm stop"}
                </button>
                <button
                  onClick={() => setKillConfirm(false)}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {actionError && (
        <div className="px-5 pb-4">
          <p className="text-xs text-loss bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">
            {actionError}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Numeric field ─────────────────────────────────────────────────────────────

function NumericField({
  label, unit, value, onChange, min, max, hint,
}: {
  label: string; unit: string; value: number;
  onChange: (v: number) => void;
  min: number; max: number; hint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-semibold text-text-primary">{label}</p>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            className="w-16 text-right text-xs font-mono bg-surface-3 border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent"
          />
          <span className="text-xs text-text-muted">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full accent-accent cursor-pointer"
      />
      <p className="text-2xs text-text-muted/60 mt-1">{hint}</p>
    </div>
  );
}
