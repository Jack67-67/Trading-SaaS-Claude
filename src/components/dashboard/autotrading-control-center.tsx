"use client";

import { useState, useTransition } from "react";
import {
  Bot, ShieldX, Pause, Play, Zap, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle2, Info, TrendingDown, TrendingUp,
  Lock, Unlock, ShieldCheck,
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
  generateEventRecommendations,
  computePerformanceTrend,
  type AutotradingMetrics,
  type AutotradingRecommendation,
  type PerformanceTrend,
  type EquityVolatility,
} from "@/lib/autotrading-ai";

// ── Risk profiles ─────────────────────────────────────────────────────────────

interface RiskProfile {
  id:               string;
  label:            string;
  description:      string;
  capitalPct:       number;
  weeklyLossPct:    number;
  monthlyLossPct:   number;
  dailyTrades:      number;
  pauseOnEvents:    boolean;
}

const RISK_PROFILES: RiskProfile[] = [
  {
    id:             "conservative",
    label:          "Conservative",
    description:    "Small size, tight stops — protect capital first",
    capitalPct:     20,
    weeklyLossPct:  2,
    monthlyLossPct: 6,
    dailyTrades:    2,
    pauseOnEvents:  true,
  },
  {
    id:             "balanced",
    label:          "Balanced",
    description:    "Moderate risk — good starting point for most strategies",
    capitalPct:     50,
    weeklyLossPct:  5,
    monthlyLossPct: 12,
    dailyTrades:    5,
    pauseOnEvents:  true,
  },
  {
    id:             "aggressive",
    label:          "Aggressive",
    description:    "Full exposure — only for validated, high-confidence strategies",
    capitalPct:     100,
    weeklyLossPct:  10,
    monthlyLossPct: 25,
    dailyTrades:    10,
    pauseOnEvents:  false,
  },
];

function detectProfile(
  capital: number, weekly: number, monthly: number,
  trades: number, pauseEvt: boolean,
): string | null {
  for (const p of RISK_PROFILES) {
    if (
      p.capitalPct     === capital &&
      p.weeklyLossPct  === weekly  &&
      p.monthlyLossPct === monthly &&
      p.dailyTrades    === trades  &&
      p.pauseOnEvents  === pauseEvt
    ) return p.id;
  }
  return null;
}

// ── Props ────────────────────────────────────────────────────────────────────

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
  maxDailyTrades:   number;
  dailyTradesCount: number;
  trend:            PerformanceTrend | null;
  equityVol:        EquityVolatility;
  // event guard data
  eventGuard:       { level: string; eventName: string; daysUntil: number } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_LABEL: Record<string, string> = {
  autotrading_on:   "Autotrading enabled",
  autotrading_off:  "Autotrading disabled",
  controls_updated: "Safety limits updated",
  paused:           "Paused",
  resumed:          "Resumed",
  kill_switch:      "Kill switch activated",
};

// ── Decision status bar ───────────────────────────────────────────────────────
// The single most important element — tells the user what is happening
// and what (if anything) they should do right now.

type DecisionLevel = "ok" | "info" | "warn" | "paused" | "stopped" | "off";

interface DecisionStatus {
  level: DecisionLevel;
  headline: string;
  subline: string;
  actionLabel?: string;
  actionFn?: () => void;
}

function buildDecision(
  status: string,
  autotradingEnabled: boolean,
  pauseReason: string | null,
  lastAction: string | null,
  lastActionAt: string | null,
  recs: AutotradingRecommendation[],
  onPause: (reason: string) => void,
  onResume: () => void,
): DecisionStatus {
  const isStopped = status === "stopped";
  const isPaused  = status === "paused";

  if (isStopped) {
    return {
      level: "stopped",
      headline: "Session permanently stopped",
      subline: "The kill switch was activated. Create a new session to continue trading.",
    };
  }

  if (isPaused) {
    return {
      level: "paused",
      headline: pauseReason ?? "Session paused",
      subline: "Review the conditions below before resuming.",
      actionLabel: "Resume trading",
      actionFn: onResume,
    };
  }

  if (!autotradingEnabled) {
    return {
      level: "off",
      headline: "Autotrading is off — monitoring disabled",
      subline: "Enable the toggle below to activate safety checks on each refresh.",
    };
  }

  // Active + autotrading on — check for warnings
  const warnings = recs.filter(r => r.severity === "warning");
  if (warnings.length > 0) {
    const top = warnings[0];
    const suggestPause = top.suggestedAction === "pause";
    const suggestReduce = top.suggestedAction === "reduce_capital";
    return {
      level: "warn",
      headline: top.title,
      subline: suggestPause
        ? "Consider pausing until conditions improve."
        : suggestReduce
        ? "Consider reducing capital allocation in Safety Limits."
        : "Review the details below and decide whether to act.",
      actionLabel: suggestPause ? "Pause now" : undefined,
      actionFn: suggestPause ? () => onPause(top.title) : undefined,
    };
  }

  const infoRecs = recs.filter(r => r.severity === "info");
  if (infoRecs.length > 0) {
    return {
      level: "info",
      headline: "Running — minor items to review",
      subline: infoRecs[0].title + ". " + (
        lastAction && lastActionAt
          ? `${ACTION_LABEL[lastAction] ?? lastAction} ${timeAgo(lastActionAt)}.`
          : "No recent actions."
      ),
    };
  }

  return {
    level: "ok",
    headline: "Running smoothly — no action needed",
    subline: lastAction && lastActionAt
      ? `${ACTION_LABEL[lastAction] ?? lastAction} · ${timeAgo(lastActionAt)}`
      : "Safety checks active. All limits within range.",
  };
}

const DECISION_STYLE: Record<DecisionLevel, {
  bg: string; border: string; icon: React.ElementType;
  iconColor: string; headlineColor: string; btnBg: string; btnText: string;
}> = {
  ok:      { bg: "bg-profit/[0.04]",       border: "border-profit/15",     icon: CheckCircle2,   iconColor: "text-profit",     headlineColor: "text-profit",     btnBg: "",          btnText: "" },
  info:    { bg: "bg-accent/[0.04]",        border: "border-accent/15",     icon: Info,           iconColor: "text-accent",     headlineColor: "text-text-primary", btnBg: "bg-accent/15 border-accent/25 text-accent hover:bg-accent/25", btnText: "" },
  warn:    { bg: "bg-amber-500/[0.06]",     border: "border-amber-500/25",  icon: AlertTriangle,  iconColor: "text-amber-400",  headlineColor: "text-amber-300",  btnBg: "bg-amber-500/15 border-amber-500/25 text-amber-300 hover:bg-amber-500/25", btnText: "" },
  paused:  { bg: "bg-amber-500/[0.06]",     border: "border-amber-500/20",  icon: Pause,          iconColor: "text-amber-400",  headlineColor: "text-amber-300",  btnBg: "bg-amber-500/15 border-amber-500/25 text-amber-300 hover:bg-amber-500/25", btnText: "" },
  stopped: { bg: "bg-loss/[0.06]",          border: "border-loss/20",       icon: ShieldX,        iconColor: "text-loss",       headlineColor: "text-loss",       btnBg: "",          btnText: "" },
  off:     { bg: "bg-surface-2/50",         border: "border-border",        icon: Bot,            iconColor: "text-text-muted", headlineColor: "text-text-secondary", btnBg: "", btnText: "" },
};

// ── Recommendation row ────────────────────────────────────────────────────────

function RecRow({
  rec,
  onPause,
  onOpenLimits,
}: {
  rec: AutotradingRecommendation;
  onPause: (reason: string) => void;
  onOpenLimits: () => void;
}) {
  const isOk   = rec.severity === "ok";
  const isWarn = rec.severity === "warning";

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-border/60 last:border-0">
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

        {/* Inline action */}
        {rec.suggestedAction && !isOk && (
          <div className="mt-2">
            {rec.suggestedAction === "pause" && (
              <button
                onClick={() => onPause(rec.title)}
                className="text-2xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded px-2 py-0.5 transition-colors"
              >
                Pause trading →
              </button>
            )}
            {rec.suggestedAction === "reduce_capital" && (
              <button
                onClick={onOpenLimits}
                className="text-2xs font-semibold text-accent hover:text-accent-hover bg-accent/10 border border-accent/20 rounded px-2 py-0.5 transition-colors"
              >
                Adjust in Safety Limits →
              </button>
            )}
            {rec.suggestedAction === "review" && (
              <span className="text-2xs text-text-muted/60">
                Consider reviewing your strategy parameters.
              </span>
            )}
          </div>
        )}
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

  const [capital, setCapital]     = useState(initCapital);
  const [weekly, setWeekly]       = useState(initWeekly);
  const [monthly, setMonthly]     = useState(initMonthly);
  const [pauseEvt, setPauseEvt]   = useState(initPauseOnEvents);
  const [maxTrades, setMaxTrades] = useState(props.maxDailyTrades);
  const [overrideMode, setOverrideMode] = useState(false);

  const activeProfile = detectProfile(capital, weekly, monthly, maxTrades, pauseEvt);

  function applyProfile(p: RiskProfile) {
    setCapital(p.capitalPct);
    setWeekly(p.weeklyLossPct);
    setMonthly(p.monthlyLossPct);
    setMaxTrades(p.dailyTrades);
    setPauseEvt(p.pauseOnEvents);
    setOverrideMode(false);
  }

  const isStopped = status === "stopped";
  const isPaused  = status === "paused";
  const isActive  = status === "active";

  function act(fn: () => Promise<{ error: string } | undefined>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setActionError(result.error);
    });
  }

  const doResume = () => act(() => resumeSession(sessionId));
  const doPause  = (reason: string) => act(() => pauseSession(sessionId, reason));

  const recommendations = metrics
    ? generateAutotradingRecommendations(metrics, {
        weeklyLossPct,
        monthlyLossPct,
        maxWeeklyLossPct: initWeekly,
        maxMonthlyLossPct: initMonthly,
      }, props.trend, props.equityVol)
    : [];

  // Merge in event recs (shown even when metrics is null)
  const eventRecs = props.eventGuard
    ? (() => {
        const g = props.eventGuard!;
        if (g.level === "danger" && !initPauseOnEvents) {
          return [{
            id: `ctrl-event-${g.eventName}`,
            severity: "warning" as const,
            title: `${g.eventName} ${g.daysUntil === 0 ? "today" : g.daysUntil === 1 ? "tomorrow" : `in ${g.daysUntil} days`} — high volatility risk`,
            body: `Auto-pause is OFF. High-impact event active. Consider pausing or reducing position size until after the release.`,
            suggestedAction: "pause" as const,
          }];
        }
        return [];
      })()
    : [];
  const allRecs = [...eventRecs, ...recommendations];

  const decision = buildDecision(
    status, autotradingEnabled, pauseReason,
    lastAction, lastActionAt, allRecs,
    doPause, doResume,
  );

  const dStyle = DECISION_STYLE[decision.level];
  const DecisionIcon = dStyle.icon;

  // Approaching-limit bar widths for weekly / monthly
  const weeklyUsed  = weeklyLossPct  !== null ? Math.min(100, (Math.abs(Math.min(0, weeklyLossPct))  / initWeekly)  * 100) : null;
  const monthlyUsed = monthlyLossPct !== null ? Math.min(100, (Math.abs(Math.min(0, monthlyLossPct)) / initMonthly) * 100) : null;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* ── Decision status bar — the primary signal ───────────────────────── */}
      <div className={cn("px-5 py-4 border-b", dStyle.bg, dStyle.border.replace("border-", "border-b-"))}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            decision.level === "ok"      && "bg-profit/15",
            decision.level === "info"    && "bg-accent/15",
            decision.level === "warn"    && "bg-amber-400/15",
            decision.level === "paused"  && "bg-amber-400/15",
            decision.level === "stopped" && "bg-loss/15",
            decision.level === "off"     && "bg-surface-3",
          )}>
            <DecisionIcon size={14} className={dStyle.iconColor} />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-semibold leading-snug", dStyle.headlineColor)}>
              {decision.headline}
            </p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {decision.subline}
            </p>
          </div>

          {decision.actionLabel && decision.actionFn && (
            <button
              disabled={isPending}
              onClick={decision.actionFn}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                dStyle.btnBg
              )}
            >
              {decision.level === "paused" ? <Play size={11} /> : null}
              {isPending ? "…" : decision.actionLabel}
            </button>
          )}
        </div>

        {/* Loss limit progress bars — shown when autotrading on and actively losing */}
        {autotradingEnabled && isActive && (weeklyUsed !== null || monthlyUsed !== null) && (
          <div className="mt-3 flex items-center gap-5">
            {weeklyUsed !== null && weeklyUsed > 0 && (
              <LimitBar label="Weekly loss" used={weeklyUsed} limitPct={initWeekly} currentPct={weeklyLossPct} />
            )}
            {monthlyUsed !== null && monthlyUsed > 0 && (
              <LimitBar label="Monthly loss" used={monthlyUsed} limitPct={initMonthly} currentPct={monthlyLossPct} />
            )}
          </div>
        )}
        {autotradingEnabled && isActive && props.dailyTradesCount > 0 && (
          <div className="mt-3 flex items-center gap-5">
            <DailyTradesBar
              count={props.dailyTradesCount}
              max={props.maxDailyTrades}
            />
          </div>
        )}
      </div>

      {/* ── Autotrading toggle ─────────────────────────────────────────────── */}
      {!isStopped && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-text-primary">Enable autotrading</p>
            <p className="text-xs text-text-muted mt-0.5">
              Safety checks run on every refresh.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={autotradingEnabled}
            disabled={isPending || isPaused}
            onClick={() => act(() => toggleAutotrading(sessionId, !autotradingEnabled))}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
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

      {/* ── Safety limits (collapsible) ────────────────────────────────────── */}
      {!isStopped && (
        <div className="border-b border-border">
          <button
            onClick={() => setControlsOpen(v => !v)}
            className="flex items-center justify-between w-full px-5 py-3 hover:bg-surface-2/40 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-text-muted/60" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Safety Limits</span>
              {activeProfile && (
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border text-accent bg-accent/10 border-accent/20 capitalize">
                  {activeProfile}
                </span>
              )}
              {!activeProfile && (
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/20">
                  Custom
                </span>
              )}
            </div>
            {controlsOpen ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
          </button>

          {controlsOpen && (
            <div className="bg-surface-0/50">

              {/* ── Risk profile selector ── */}
              <div className="px-5 pt-4 pb-3 border-b border-border/60">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2.5">
                  Risk Profile
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {RISK_PROFILES.map(p => {
                    const isActive = activeProfile === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyProfile(p)}
                        className={cn(
                          "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                          isActive
                            ? "border-accent bg-accent/10"
                            : "border-border bg-surface-1 hover:border-border-hover hover:bg-surface-2/50",
                        )}
                      >
                        <span className={cn(
                          "text-xs font-bold",
                          isActive ? "text-accent" : "text-text-secondary",
                        )}>
                          {p.label}
                        </span>
                        <span className="text-2xs text-text-muted leading-snug">{p.description}</span>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-2xs font-mono text-text-muted/70">{p.capitalPct}% cap</span>
                          <span className="text-2xs font-mono text-text-muted/70">−{p.weeklyLossPct}%/wk</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Advanced override toggle ── */}
              <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {overrideMode
                    ? <Unlock size={12} className="text-amber-400 shrink-0" />
                    : <Lock    size={12} className="text-text-muted/60 shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Advanced Override</p>
                    <p className="text-xs text-text-muted">
                      {overrideMode
                        ? "Limits unlocked — changes bypass the safety profile"
                        : "Lock limits to profile presets"}
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={overrideMode}
                  onClick={() => setOverrideMode(v => !v)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    overrideMode ? "bg-amber-400" : "bg-surface-3",
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                    overrideMode ? "translate-x-4" : "translate-x-0",
                  )} />
                </button>
              </div>

              {/* Override warning */}
              {overrideMode && (
                <div className="mx-5 mt-3 mb-1 flex items-start gap-2 rounded-xl px-3 py-2.5 bg-amber-400/[0.07] border border-amber-400/25">
                  <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/90 leading-snug">
                    Override active — your limits no longer match a safety profile.
                    Ensure you understand the risk before saving.
                  </p>
                </div>
              )}

              {/* ── Limit fields ── */}
              <div className={cn("px-5 pb-5 pt-3 space-y-4", !overrideMode && "opacity-60 pointer-events-none select-none")}>
                <NumericField
                  label="Capital allocation" unit="%" value={capital} onChange={setCapital}
                  min={1} max={100} hint="Percentage of portfolio allocated to this session"
                />
                <NumericField
                  label="Max weekly loss" unit="%" value={weekly} onChange={setWeekly}
                  min={1} max={50} hint="Auto-pause if this session loses more than this in 7 days"
                />
                <NumericField
                  label="Max monthly loss" unit="%" value={monthly} onChange={setMonthly}
                  min={1} max={80} hint="Auto-pause if this session loses more than this in 30 days"
                />
                <NumericField
                  label="Max daily trades" unit="" value={maxTrades} onChange={setMaxTrades}
                  min={1} max={100} hint="Auto-pause when this many trades have been placed today"
                />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Pause on major events</p>
                    <p className="text-xs text-text-muted mt-0.5">Auto-pause when FOMC, CPI, or NFP is today</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={pauseEvt}
                    onClick={() => setPauseEvt(v => !v)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      pauseEvt ? "bg-accent" : "bg-surface-3",
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                      pauseEvt ? "translate-x-4" : "translate-x-0",
                    )} />
                  </button>
                </div>
              </div>

              {/* Save button */}
              <div className="px-5 pb-5">
                <button
                  disabled={isPending}
                  onClick={() => act(() => updateSafetyControls(sessionId, {
                    maxCapitalPct:    capital,
                    maxWeeklyLossPct: weekly,
                    maxMonthlyLossPct: monthly,
                    pauseOnEvents:    pauseEvt,
                    maxDailyTrades:   maxTrades,
                  }))}
                  className={cn(
                    "w-full rounded-lg border text-xs font-semibold py-2 transition-colors disabled:opacity-50",
                    overrideMode
                      ? "bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
                      : "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20",
                  )}
                >
                  {isPending ? "Saving…" : overrideMode ? "Save custom limits" : "Save limits"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI recommendations ─────────────────────────────────────────────── */}
      {allRecs.length > 0 && (
        <div className={cn("border-b border-border", !isStopped && "")}>
          <div className="px-5 py-2.5 border-b border-border/60 flex items-center gap-2 bg-surface-1/50">
            <Zap size={11} className="text-text-muted/60" />
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Analysis</p>
            {props.trend && props.trend.level !== "insufficient" && props.trend.level !== "stable" && (
              <span className={cn(
                "ml-auto inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full border",
                props.trend.level === "improving" && "text-profit bg-profit/10 border-profit/20",
                props.trend.level === "declining" && "text-loss bg-loss/10 border-loss/20",
                props.trend.level === "volatile"  && "text-amber-400 bg-amber-400/10 border-amber-400/20",
              )}>
                {props.trend.level === "improving" && <TrendingUp size={10} />}
                {props.trend.level === "declining" && <TrendingDown size={10} />}
                {props.trend.level === "volatile"  && <AlertTriangle size={10} />}
                {props.trend.level}
              </span>
            )}
          </div>
          <div className="bg-surface-0">
            {allRecs.map(rec => (
              <RecRow
                key={rec.id}
                rec={rec}
                onPause={doPause}
                onOpenLimits={() => setControlsOpen(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Manual controls ─────────────────────────────────────────────────── */}
      {!isStopped && (
        <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap bg-surface-0/30">
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

          <div className="ml-auto flex items-center gap-2">
            {!killConfirm ? (
              <button
                disabled={isPending}
                onClick={() => setKillConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-loss/25 px-3 py-2 text-xs font-semibold text-loss/60 hover:text-loss hover:border-loss/50 hover:bg-loss/[0.06] transition-colors disabled:opacity-50"
              >
                <ShieldX size={11} />
                Kill switch
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-loss/80">Permanently stop? Cannot undo.</span>
                <button
                  disabled={isPending}
                  onClick={() => { setKillConfirm(false); act(() => killSwitch(sessionId)); }}
                  className="rounded-lg bg-loss px-3 py-2 text-xs font-bold text-white hover:bg-loss/80 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Stopping…" : "Confirm stop"}
                </button>
                <button onClick={() => setKillConfirm(false)} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
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

// ── Loss limit progress bar ───────────────────────────────────────────────────

function LimitBar({
  label, used, limitPct, currentPct,
}: {
  label: string; used: number; limitPct: number; currentPct: number | null;
}) {
  const isNear = used > 75;
  const isCritical = used > 90;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-text-muted">{label}</span>
        <span className={cn(
          "text-2xs font-mono font-semibold",
          isCritical ? "text-loss" : isNear ? "text-amber-400" : "text-text-muted/70"
        )}>
          {currentPct !== null ? `${currentPct.toFixed(1)}%` : "—"} / −{limitPct}%
        </span>
      </div>
      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isCritical ? "bg-loss" : isNear ? "bg-amber-400" : "bg-text-muted/40"
          )}
          style={{ width: `${used}%` }}
        />
      </div>
    </div>
  );
}

// ── Daily trades bar ──────────────────────────────────────────────────────────

function DailyTradesBar({ count, max }: { count: number; max: number }) {
  const used = Math.min(100, (count / max) * 100);
  const isNear = used > 75;
  const isCritical = used >= 100;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-text-muted">Daily trades</span>
        <span className={cn(
          "text-2xs font-mono font-semibold",
          isCritical ? "text-loss" : isNear ? "text-amber-400" : "text-text-muted/70"
        )}>
          {count} / {max}
        </span>
      </div>
      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isCritical ? "bg-loss" : isNear ? "bg-amber-400" : "bg-text-muted/40"
          )}
          style={{ width: `${used}%` }}
        />
      </div>
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
            onChange={e => {
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
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full accent-accent cursor-pointer"
      />
      <p className="text-2xs text-text-muted/60 mt-1">{hint}</p>
    </div>
  );
}
