"use client";

import { useState, useTransition } from "react";
import { FileText, Eye, Zap, ChevronRight, RefreshCw, Lock, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTradingMode, type TradingMode } from "@/app/actions/live-trading";
import { LiveActivationDialog } from "@/components/dashboard/live-activation-dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModeOption {
  value:       TradingMode;
  label:       string;
  sub:         string;
  icon:        React.ElementType;
  iconClass:   string;
  activeClass: string;
  borderClass: string;
  realMoney?:  boolean;
}

const MODES: ModeOption[] = [
  {
    value:       "paper",
    label:       "Paper",
    sub:         "Simulation only — no signals",
    icon:        FileText,
    iconClass:   "text-text-muted",
    activeClass: "text-text-primary",
    borderClass: "border-border",
  },
  {
    value:       "shadow",
    label:       "Shadow",
    sub:         "Real signals — no orders",
    icon:        Eye,
    iconClass:   "text-accent",
    activeClass: "text-accent",
    borderClass: "border-accent/30",
  },
  {
    value:       "live_prep",
    label:       "Live Prep",
    sub:         "Order preview + readiness",
    icon:        Zap,
    iconClass:   "text-amber-400",
    activeClass: "text-amber-400",
    borderClass: "border-amber-400/30",
  },
  {
    value:       "live",
    label:       "Live",
    sub:         "Real orders — real money",
    icon:        Radio,
    iconClass:   "text-profit",
    activeClass: "text-profit",
    borderClass: "border-profit/30",
    realMoney:   true,
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function TradingModeSelector({
  sessionId,
  sessionName,
  currentMode,
  brokerConnected,
  sessionStopped,
  allReadinessPassed = false,
  maxCapitalPct      = 100,
  allocatedCapital   = 0,
  symbol             = "",
}: {
  sessionId:           string;
  sessionName?:        string;
  currentMode:         TradingMode;
  brokerConnected:     boolean;
  sessionStopped:      boolean;
  allReadinessPassed?: boolean;
  maxCapitalPct?:      number;
  allocatedCapital?:   number;
  symbol?:             string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError]          = useState<string | null>(null);
  const [showLiveDialog, setShowLiveDialog] = useState(false);

  function handleSelect(mode: TradingMode) {
    if (mode === currentMode) return;
    if (sessionStopped) return;
    setError(null);

    // Live mode: intercept with the safety dialog
    if (mode === "live") {
      setShowLiveDialog(true);
      return;
    }

    startTransition(async () => {
      const res = await setTradingMode(sessionId, mode);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((opt, idx) => {
            const isActive = currentMode === opt.value;

            // Lock conditions
            const isLivePrepLocked = opt.value === "live_prep" && !brokerConnected;
            const isLiveLocked     = opt.value === "live" && (
              !brokerConnected || currentMode === "paper" || currentMode === "shadow"
            );
            const isLocked   = isLivePrepLocked || isLiveLocked;
            const isDisabled = sessionStopped || pending || isLocked;

            // Sub-text override when locked
            const subText = isLivePrepLocked ? "Connect a broker first"
              : isLiveLocked                 ? "Complete Live Prep first"
              : opt.sub;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                disabled={isDisabled}
                className={cn(
                  "relative flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-all",
                  isActive
                    ? cn("bg-surface-2", opt.borderClass)
                    : "border-border bg-surface-0 hover:border-border-hover hover:bg-surface-1",
                  isDisabled && "opacity-50 cursor-not-allowed",
                  opt.value === "live" && !isActive && !isLiveLocked && "ring-1 ring-profit/20",
                )}
              >
                {/* Real money badge */}
                {opt.realMoney && !isLiveLocked && (
                  <span className="absolute -top-1.5 right-2 text-2xs font-bold text-profit/80 bg-profit/10 border border-profit/20 rounded px-1">
                    Real $
                  </span>
                )}

                {/* Step indicator */}
                <div className="flex items-center gap-1.5 w-full">
                  <span className={cn(
                    "w-4 h-4 rounded-full text-2xs font-bold flex items-center justify-center shrink-0",
                    isActive
                      ? cn("bg-current text-surface-0", opt.iconClass)
                      : "bg-surface-3 text-text-muted",
                  )}>
                    {idx + 1}
                  </span>
                  <span className={cn(
                    "text-xs font-semibold",
                    isActive ? opt.activeClass : "text-text-secondary",
                  )}>
                    {opt.label}
                  </span>
                  {isLocked && (
                    <Lock size={10} className="text-text-muted/50 ml-auto" />
                  )}
                  {isActive && !isLocked && (
                    <span className={cn(
                      "ml-auto w-1.5 h-1.5 rounded-full",
                      opt.iconClass.replace("text-", "bg-"),
                    )} />
                  )}
                </div>
                <p className="text-2xs text-text-muted leading-snug pl-5">{subText}</p>
              </button>
            );
          })}
        </div>

        {/* Flow label */}
        <div className="hidden sm:flex items-center justify-center gap-1 text-text-muted/30">
          {(["Paper", "Shadow", "Live Prep", "Live"] as const).map((label, i, arr) => (
            <span key={label} className="flex items-center gap-1">
              <span className={cn(
                "text-2xs",
                label === "Shadow" ? "text-accent/40" : "",
                label === "Live"   ? "text-profit/40 font-semibold" : "",
              )}>{label}</span>
              {i < arr.length - 1 && <ChevronRight size={10} />}
            </span>
          ))}
        </div>

        {/* Shadow mode note */}
        {currentMode === "shadow" && (
          <div className="flex items-center gap-1.5 px-1">
            <Eye size={10} className="text-accent/60" />
            <p className="text-2xs text-accent/70">
              Shadow mode — signals are real, orders are not. This is a dry run.
            </p>
          </div>
        )}

        {pending && (
          <p className="text-2xs text-text-muted flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin" />
            Updating mode…
          </p>
        )}
        {error && (
          <p className="text-2xs text-loss">{error}</p>
        )}
      </div>

      {/* Live activation dialog */}
      {showLiveDialog && (
        <LiveActivationDialog
          sessionId={sessionId}
          sessionName={sessionName ?? sessionId}
          symbol={symbol}
          maxCapitalPct={maxCapitalPct}
          allocatedCapital={allocatedCapital}
          allReadinessPassed={allReadinessPassed}
          onClose={() => setShowLiveDialog(false)}
        />
      )}
    </>
  );
}
