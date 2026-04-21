"use client";

import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────────

interface CheckItem {
  id:       string;
  label:    string;
  passed:   boolean;
  detail:   string;
  warning?: boolean;  // amber instead of red when failed (non-blocking)
}

export interface LiveSafetyChecklistProps {
  // Broker
  brokerConnected:    boolean;
  brokerStatus:       string | null;
  accountActive:      boolean;
  hasBuyingPower:     boolean;
  buyingPower:        number | null;
  estimatedOrderCost: number;
  // Strategy quality
  hasStrategy:        boolean;
  profitFactor:       number | null;
  totalTrades:        number | null;
  sharpeRatio:        number | null;
  // Risk limits
  weeklyLossOk:       boolean;
  monthlyLossOk:      boolean;
  maxCapitalPct:      number;
  maxWeeklyLossPct:   number;
  maxMonthlyLossPct:  number;
  // Event guard
  pauseOnEvents:      boolean;
  eventDanger:        boolean;
  eventName:          string | null;
  // Session
  sessionStopped:     boolean;
  sessionPaused:      boolean;
}

// ── Component ───────────────────────────────────────────────────────────────────

export function LiveSafetyChecklist(p: LiveSafetyChecklistProps) {

  // Strategy validated: has results, profit factor > 1, and at least 10 trades
  const stratValidated =
    p.hasStrategy &&
    (p.profitFactor === null || p.profitFactor > 1.0) &&
    (p.totalTrades === null || p.totalTrades >= 10);

  const stratDetail =
    !p.hasStrategy
      ? "No backtest results yet — run a simulation first to measure strategy edge."
      : p.totalTrades !== null && p.totalTrades < 10
      ? `Only ${p.totalTrades} backtest trades — need at least 10 for a meaningful sample.`
      : p.profitFactor !== null && p.profitFactor <= 1.0
      ? `Profit factor is ${p.profitFactor.toFixed(2)} — needs to be > 1.0 (break-even).`
      : p.sharpeRatio !== null && p.sharpeRatio < 0.5
      ? `Sharpe ratio ${p.sharpeRatio.toFixed(2)} is low — strategy may underperform on risk-adjusted basis.`
      : `Strategy validated: profit factor ${p.profitFactor?.toFixed(2) ?? "–"}, ${p.totalTrades ?? "–"} trades, Sharpe ${p.sharpeRatio?.toFixed(2) ?? "–"}.`;

  // Risk limits explicitly configured (tighter than 100%/∞)
  const riskConfigured =
    p.maxCapitalPct <= 50 &&
    p.maxWeeklyLossPct <= 10 &&
    p.maxMonthlyLossPct <= 20;

  const riskDetail =
    p.maxCapitalPct > 50
      ? `Capital allocation is ${p.maxCapitalPct}% — reduce to ≤ 50% before going live.`
      : p.maxWeeklyLossPct > 10
      ? `Weekly loss limit ${p.maxWeeklyLossPct}% is too loose — set to ≤ 10%.`
      : p.maxMonthlyLossPct > 20
      ? `Monthly loss limit ${p.maxMonthlyLossPct}% is too loose — set to ≤ 20%.`
      : `Capital ${p.maxCapitalPct}%, weekly limit ${p.maxWeeklyLossPct}%, monthly limit ${p.maxMonthlyLossPct}%.`;

  const checks: CheckItem[] = [
    {
      id:     "strategy",
      label:  "Strategy validated",
      passed: stratValidated,
      detail: stratDetail,
    },
    {
      id:     "broker",
      label:  "Broker connected",
      passed: p.brokerConnected && p.brokerStatus === "connected",
      detail: !p.brokerConnected
        ? "No broker linked. Go to Settings → Broker Connection."
        : p.brokerStatus !== "connected"
        ? "Broker shows an error — refresh it in Settings."
        : "Broker verified and reachable.",
    },
    {
      id:     "account",
      label:  "Account is ACTIVE",
      passed: p.accountActive,
      detail: p.accountActive
        ? "Broker account status is ACTIVE."
        : "Account is not ACTIVE — cannot place orders.",
    },
    {
      id:     "capital",
      label:  "Buying power sufficient",
      passed: p.hasBuyingPower,
      detail: p.buyingPower === null
        ? `Buying power unknown — refresh broker. Estimated first order: ~$${p.estimatedOrderCost.toLocaleString()}.`
        : p.hasBuyingPower
        ? `$${p.buyingPower.toLocaleString()} available, covers estimated ~$${p.estimatedOrderCost.toLocaleString()} order.`
        : `Only $${p.buyingPower.toLocaleString()} available — estimated order is ~$${p.estimatedOrderCost.toLocaleString()}.`,
    },
    {
      id:     "risk",
      label:  "Risk limits configured",
      passed: riskConfigured,
      detail: riskDetail,
    },
    {
      id:     "loss",
      label:  "Within loss limits",
      passed: p.weeklyLossOk && p.monthlyLossOk,
      detail: !p.weeklyLossOk
        ? "Weekly loss limit already exceeded — strategy would auto-pause immediately."
        : !p.monthlyLossOk
        ? "Monthly loss limit already exceeded — strategy would auto-pause immediately."
        : "Weekly and monthly losses are within configured limits.",
    },
    {
      id:      "events",
      label:   "Event guard active",
      passed:  p.pauseOnEvents,
      detail:  p.pauseOnEvents
        ? `Auto-pauses on high-impact events${p.eventDanger ? ` — event active${p.eventName ? ` (${p.eventName})` : ""}` : " — no events today"}.`
        : "Event guard is disabled — strategy will trade through high-impact news events.",
      warning: true,
    },
    {
      id:      "event_now",
      label:   "No high-impact event",
      passed:  !p.eventDanger,
      detail:  p.eventDanger
        ? `High-impact event active${p.eventName ? ` (${p.eventName})` : ""}. Elevated volatility — consider delaying go-live.`
        : "No dangerous economic events scheduled today.",
      warning: true,
    },
    {
      id:     "session",
      label:  "Session active",
      passed: !p.sessionStopped && !p.sessionPaused,
      detail: p.sessionStopped
        ? "Session is permanently stopped. Create a new session to trade live."
        : p.sessionPaused
        ? "Session is paused — resume it before activating live trading."
        : "Session is active and operational.",
    },
  ];

  const hardFails   = checks.filter(c => !c.passed && !c.warning);
  const softFails   = checks.filter(c => !c.passed &&  c.warning);
  const passedCount = checks.filter(c => c.passed).length;
  const total       = checks.length;
  const allPassed   = hardFails.length === 0;
  const pct         = Math.round((passedCount / total) * 100);

  const barColor =
    hardFails.length > 0 ? "bg-loss"
    : softFails.length > 0 ? "bg-amber-400"
    : "bg-profit";

  const borderColor =
    hardFails.length > 0 ? "border-loss/30 bg-loss/[0.02]"
    : softFails.length > 0 ? "border-amber-400/25 bg-amber-400/[0.02]"
    : "border-profit/20 bg-profit/[0.02]";

  const statusLabel =
    allPassed && softFails.length === 0 ? "Ready for live"
    : hardFails.length > 0 ? `${hardFails.length} blocker${hardFails.length !== 1 ? "s" : ""}`
    : `${softFails.length} warning${softFails.length !== 1 ? "s" : ""}`;

  const statusColor =
    allPassed && softFails.length === 0
      ? "text-profit bg-profit/10 border-profit/20"
      : hardFails.length > 0
      ? "text-loss bg-loss/10 border-loss/20"
      : "text-amber-400 bg-amber-400/10 border-amber-400/20";

  return (
    <div className={cn("rounded-2xl border overflow-hidden", borderColor)}>

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-inherit flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className={cn(
            hardFails.length > 0 ? "text-loss"
            : softFails.length > 0 ? "text-amber-400"
            : "text-profit"
          )} />
          <span className="text-xs font-semibold text-text-primary">
            Ready for Live Trading?
          </span>
        </div>
        <span className={cn("text-2xs font-bold px-2.5 py-1 rounded-full border", statusColor)}>
          {statusLabel}
        </span>
      </div>

      {/* Readiness progress bar */}
      <div className="px-5 py-3 border-b border-inherit">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-2xs text-text-muted font-medium">Readiness score</span>
          <span className="text-2xs font-mono font-semibold text-text-secondary">
            {passedCount}/{total} checks
          </span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allPassed && (
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp size={10} className="text-profit" />
            <p className="text-2xs text-profit font-medium">
              All checks passed — strategy is ready for live activation.
            </p>
          </div>
        )}
      </div>

      {/* Check rows */}
      <div className="divide-y divide-border/40">
        {checks.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5 px-5 py-2.5">
            <span className="shrink-0 mt-0.5">
              {c.passed ? (
                <CheckCircle2 size={13} className="text-profit" />
              ) : c.warning ? (
                <AlertTriangle size={13} className="text-amber-400" />
              ) : (
                <XCircle size={13} className="text-loss" />
              )}
            </span>
            <div className="min-w-0">
              <span className={cn(
                "text-xs font-medium",
                c.passed ? "text-text-primary"
                : c.warning ? "text-amber-400"
                : "text-loss"
              )}>
                {c.label}
              </span>
              {!c.warning && !c.passed && (
                <span className="ml-2 text-2xs text-loss/70 font-medium">blocker</span>
              )}
              <p className="text-2xs text-text-muted leading-snug mt-0.5">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-inherit bg-surface-0/50">
        <p className="text-2xs text-text-muted/70 leading-relaxed">
          Blockers must be resolved before activating live trading. Warnings are advisable but won&apos;t prevent activation.
        </p>
      </div>

    </div>
  );
}
