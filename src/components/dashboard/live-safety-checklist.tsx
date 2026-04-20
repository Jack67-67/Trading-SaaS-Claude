"use client";

import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CheckItem {
  label:    string;
  passed:   boolean;
  detail:   string;
  warning?: boolean;   // amber instead of red when failed
}

interface LiveSafetyChecklistProps {
  brokerConnected:     boolean;
  brokerStatus:        string | null;
  accountActive:       boolean;
  hasBuyingPower:      boolean;
  buyingPower:         number | null;
  estimatedOrderCost:  number;
  weeklyLossOk:        boolean;
  monthlyLossOk:       boolean;
  eventDanger:         boolean;
  eventName:           string | null;
  sessionStopped:      boolean;
  sessionPaused:       boolean;
  hasStrategy:         boolean;
  liveDisabled:        boolean;      // true = live mode not yet enabled (good)
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LiveSafetyChecklist({
  brokerConnected,
  brokerStatus,
  accountActive,
  hasBuyingPower,
  buyingPower,
  estimatedOrderCost,
  weeklyLossOk,
  monthlyLossOk,
  eventDanger,
  eventName,
  sessionStopped,
  sessionPaused,
  hasStrategy,
  liveDisabled,
}: LiveSafetyChecklistProps) {
  const checks: CheckItem[] = [
    {
      label:  "Broker connected",
      passed: brokerConnected && brokerStatus === "connected",
      detail: !brokerConnected
        ? "No broker linked. Go to Settings → Broker Connection."
        : brokerStatus !== "connected"
        ? "Broker shows an error — refresh it in Settings."
        : "Broker verified and reachable.",
    },
    {
      label:  "Account is ACTIVE",
      passed: accountActive,
      detail: accountActive
        ? "Broker account status is ACTIVE."
        : "Account is not ACTIVE — cannot place orders.",
    },
    {
      label:  "Sufficient buying power",
      passed: hasBuyingPower,
      detail: buyingPower === null
        ? `Buying power unknown. Refresh broker connection. Estimated order: ~$${estimatedOrderCost.toLocaleString()}.`
        : hasBuyingPower
        ? `$${buyingPower.toLocaleString()} available, covers ~$${estimatedOrderCost.toLocaleString()} estimated order.`
        : `Only $${buyingPower.toLocaleString()} available — estimated order requires ~$${estimatedOrderCost.toLocaleString()}.`,
    },
    {
      label:  "Risk limits valid",
      passed: weeklyLossOk && monthlyLossOk,
      detail: !weeklyLossOk
        ? "Weekly loss limit exceeded — session would auto-pause on execution."
        : !monthlyLossOk
        ? "Monthly loss limit exceeded — session would auto-pause on execution."
        : "Weekly and monthly loss limits within bounds.",
    },
    {
      label:   "No high-impact event",
      passed:  !eventDanger,
      detail:  eventDanger
        ? `High-impact event active${eventName ? ` (${eventName})` : ""}. Elevated volatility risk.`
        : "No dangerous economic events today.",
      warning: true,   // warning (amber) when failed, not hard blocker
    },
    {
      label:  "Kill switch not triggered",
      passed: !sessionStopped,
      detail: sessionStopped
        ? "Session is permanently stopped. Create a new session."
        : !sessionPaused
        ? "Session is active and running."
        : "Session is paused — resume before going live.",
    },
    {
      label:  "Strategy selected",
      passed: hasStrategy,
      detail: hasStrategy
        ? "Strategy has backtest results and a measurable edge."
        : "No backtest data yet — run a simulation to generate metrics.",
    },
    {
      label:  "Live execution OFF",
      passed: liveDisabled,
      detail: liveDisabled
        ? "Live execution is disabled. Stage 4 is not yet available."
        : "Live execution is active — real orders can be placed.",
      warning: false,
    },
  ];

  const failures   = checks.filter(c => !c.passed);
  const allPassed  = failures.length === 0;
  const hardFails  = failures.filter(c => !c.warning).length;

  return (
    <div className={cn(
      "rounded-2xl border px-5 py-4 space-y-4",
      hardFails > 0 ? "border-loss/30 bg-loss/[0.02]"
        : failures.length > 0 ? "border-amber-400/25 bg-amber-400/[0.02]"
        : "border-profit/20 bg-profit/[0.02]",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className={cn(
            hardFails > 0 ? "text-loss" : failures.length > 0 ? "text-amber-400" : "text-profit"
          )} />
          <span className="text-xs font-semibold text-text-primary">Live Safety Checklist</span>
        </div>
        <span className={cn(
          "text-2xs font-bold px-2 py-0.5 rounded-full border",
          allPassed
            ? "text-profit bg-profit/10 border-profit/20"
            : hardFails > 0
            ? "text-loss bg-loss/10 border-loss/20"
            : "text-amber-400 bg-amber-400/10 border-amber-400/20"
        )}>
          {allPassed ? "All clear" : hardFails > 0 ? `${hardFails} blocker${hardFails !== 1 ? "s" : ""}` : "Warnings"}
        </span>
      </div>

      {/* Check rows */}
      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2.5">
            {c.passed ? (
              <CheckCircle2 size={13} className="text-profit shrink-0 mt-0.5" />
            ) : c.warning ? (
              <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={13} className="text-loss shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <span className={cn(
                "text-xs font-medium",
                c.passed ? "text-text-primary" : c.warning ? "text-amber-400" : "text-loss"
              )}>
                {c.label}
              </span>
              <p className="text-2xs text-text-muted leading-snug mt-0.5">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
