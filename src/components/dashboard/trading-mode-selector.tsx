"use client";

import { useState, useTransition } from "react";
import { FileText, Eye, Zap, ChevronRight, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTradingMode, type TradingMode } from "@/app/actions/live-trading";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModeOption {
  value:        TradingMode;
  label:        string;
  sub:          string;
  icon:         React.ElementType;
  iconClass:    string;
  activeClass:  string;
  borderClass:  string;
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
    sub:         "Signals visible — no execution",
    icon:        Eye,
    iconClass:   "text-accent",
    activeClass: "text-accent",
    borderClass: "border-accent/30",
  },
  {
    value:       "live_prep",
    label:       "Live Prep",
    sub:         "Order preview + readiness checks",
    icon:        Zap,
    iconClass:   "text-amber-400",
    activeClass: "text-amber-400",
    borderClass: "border-amber-400/30",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function TradingModeSelector({
  sessionId,
  currentMode,
  brokerConnected,
  sessionStopped,
}: {
  sessionId:       string;
  currentMode:     TradingMode;
  brokerConnected: boolean;
  sessionStopped:  boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError]          = useState<string | null>(null);

  function handleSelect(mode: TradingMode) {
    if (mode === currentMode) return;
    if (sessionStopped) return;
    setError(null);
    startTransition(async () => {
      const res = await setTradingMode(sessionId, mode);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((opt, idx) => {
          const isActive     = currentMode === opt.value;
          const isLivePrepLocked = opt.value === "live_prep" && !brokerConnected;
          const isDisabled   = sessionStopped || pending || isLivePrepLocked;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              disabled={isDisabled}
              className={cn(
                "relative flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-all",
                isActive
                  ? cn("bg-surface-2", opt.borderClass)
                  : "border-border bg-surface-0 hover:border-border-hover hover:bg-surface-1",
                isDisabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {/* Step indicator */}
              <div className="flex items-center gap-1.5 w-full">
                <span className={cn(
                  "w-4 h-4 rounded-full text-2xs font-bold flex items-center justify-center shrink-0",
                  isActive
                    ? cn("bg-current text-surface-0", opt.iconClass)
                    : "bg-surface-3 text-text-muted"
                )}>
                  {idx + 1}
                </span>
                <span className={cn(
                  "text-xs font-semibold",
                  isActive ? opt.activeClass : "text-text-secondary"
                )}>
                  {opt.label}
                </span>
                {isLivePrepLocked && (
                  <Lock size={10} className="text-text-muted/50 ml-auto" />
                )}
                {isActive && !isLivePrepLocked && (
                  <span className={cn(
                    "ml-auto w-1.5 h-1.5 rounded-full",
                    opt.iconClass.replace("text-", "bg-"),
                  )} />
                )}
              </div>
              <p className="text-2xs text-text-muted leading-snug pl-5">{opt.sub}</p>
              {isLivePrepLocked && (
                <p className="text-2xs text-text-muted/60 leading-snug pl-5">
                  Connect a broker first
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Flow arrow (desktop) */}
      <div className="hidden sm:flex items-center justify-center gap-1 text-text-muted/30">
        <span className="text-2xs">Paper</span>
        <ChevronRight size={10} />
        <span className="text-2xs">Shadow</span>
        <ChevronRight size={10} />
        <span className="text-2xs">Live Prep</span>
        <ChevronRight size={10} />
        <span className="text-2xs text-text-muted/20">Live (soon)</span>
      </div>

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
  );
}
