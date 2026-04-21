"use client";

import { useState, useTransition } from "react";
import { Radio, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, ChevronRight, Loader2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTradingMode } from "@/app/actions/live-trading";

// ── Types ───────────────────────────────────────────────────────────────────────

interface LiveActivationDialogProps {
  sessionId:          string;
  sessionName:        string;
  symbol:             string;
  maxCapitalPct:      number;
  allocatedCapital:   number;
  allReadinessPassed: boolean;
  onClose:            () => void;
}

type Step = "warning" | "limits" | "confirm";

// ── Overlay ──────────────────────────────────────────────────────────────────────

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {children}
    </div>
  );
}

// ── Step 1: Real Money Warning ────────────────────────────────────────────────

function WarningStep({ onNext, onCancel }: { onNext: () => void; onCancel: () => void }) {
  return (
    <div className="bg-surface-1 border border-loss/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-loss/30 bg-loss/[0.03]">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-loss/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-loss" />
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">You are about to enable real trading</p>
            <p className="text-xs text-text-muted mt-0.5">Read carefully before continuing</p>
          </div>
        </div>
      </div>

      {/* Warning list */}
      <div className="px-6 py-5 space-y-3">
        {[
          {
            title:  "Real money at risk",
            detail: "Live mode sends actual buy and sell orders to your broker. Losses are real and immediate.",
          },
          {
            title:  "No undo for filled orders",
            detail: "Once an order fills, it cannot be reversed. You can stop the strategy but open positions remain.",
          },
          {
            title:  "Market conditions may differ from backtests",
            detail: "Slippage, spreads, and news events can cause real results to diverge from simulated performance.",
          },
          {
            title:  "Start small",
            detail: "We strongly recommend limiting capital to a small amount (5–10%) until the strategy proves stable in live conditions.",
          },
        ].map(({ title, detail }) => (
          <div key={title} className="flex items-start gap-2.5">
            <XCircle size={13} className="text-loss/70 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-text-primary">{title}</p>
              <p className="text-2xs text-text-muted leading-snug mt-0.5">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-3 border border-border px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-2 hover:border-border-hover transition-all"
        >
          I understand — continue
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Recommended Limits ────────────────────────────────────────────────

function LimitsStep({
  symbol, maxCapitalPct, allocatedCapital,
  onNext, onCancel,
}: {
  symbol: string;
  maxCapitalPct: number;
  allocatedCapital: number;
  onNext: () => void;
  onCancel: () => void;
}) {
  const isCapitalSafe    = maxCapitalPct <= 10;
  const isCapitalCaution = maxCapitalPct > 10 && maxCapitalPct <= 25;

  return (
    <div className="bg-surface-1 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-amber-500/20 bg-amber-400/[0.03]">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-amber-400" />
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">Recommended limits for first live session</p>
            <p className="text-xs text-text-muted mt-0.5">Reduce risk during your live validation period</p>
          </div>
        </div>
      </div>

      {/* Capital assessment */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary">Current capital allocation</span>
          <span className={cn(
            "text-xs font-bold font-mono",
            isCapitalSafe ? "text-profit"
            : isCapitalCaution ? "text-amber-400"
            : "text-loss"
          )}>
            {maxCapitalPct}% — ${allocatedCapital.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isCapitalSafe ? "bg-profit"
              : isCapitalCaution ? "bg-amber-400"
              : "bg-loss"
            )}
            style={{ width: `${Math.min(maxCapitalPct, 100)}%` }}
          />
        </div>
        <p className={cn("text-2xs", isCapitalSafe ? "text-profit" : isCapitalCaution ? "text-amber-400" : "text-loss")}>
          {isCapitalSafe
            ? "Conservative — good starting point for live validation."
            : isCapitalCaution
            ? "Moderate risk. Consider reducing to ≤ 10% for your first live week."
            : `High allocation for first live session. Strongly recommended: reduce to ≤ 10% in the control panel before continuing.`}
        </p>
      </div>

      {/* Recommendations */}
      <div className="px-6 py-4 space-y-2.5">
        <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">First-session guidelines</p>
        {[
          {
            label:  "Capital limit",
            rec:    "≤ 10% of portfolio",
            why:    "Limits max exposure while the strategy proves itself in real conditions.",
            ok:     maxCapitalPct <= 10,
          },
          {
            label:  "Max daily trades",
            rec:    "2–3 trades/day",
            why:    "Reduces compounding errors if the strategy misbehaves early.",
            ok:     true,
          },
          {
            label:  "Stop loss",
            rec:    "< 2% per trade",
            why:    "Tight stops preserve capital during live adjustment period.",
            ok:     true,
          },
          {
            label:  "Strategy count",
            rec:    "1 strategy only",
            why:    `Only run ${symbol} live until it has at least 10 confirmed live trades.`,
            ok:     true,
          },
        ].map(({ label, rec, why, ok }) => (
          <div key={label} className="flex items-start gap-2.5">
            {ok
              ? <CheckCircle2 size={13} className="text-profit shrink-0 mt-0.5" />
              : <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-text-primary">{label}</span>
                <span className="text-2xs font-mono text-accent">{rec}</span>
              </div>
              <p className="text-2xs text-text-muted leading-snug mt-0.5">{why}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-3 border border-border px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-2 hover:border-border-hover transition-all"
        >
          Understood — final check
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Final Confirmation ────────────────────────────────────────────────

function ConfirmStep({
  sessionName, allReadinessPassed,
  onConfirm, onCancel, pending, error,
}: {
  sessionName:        string;
  allReadinessPassed: boolean;
  onConfirm:          () => void;
  onCancel:           () => void;
  pending:            boolean;
  error:              string | null;
}) {
  const [checks, setChecks] = useState({ realMoney: false, readChecklist: false, startSmall: false });
  const allChecked = checks.realMoney && checks.readChecklist && checks.startSmall;
  const canActivate = allChecked && allReadinessPassed;

  const toggle = (k: keyof typeof checks) =>
    setChecks(prev => ({ ...prev, [k]: !prev[k] }));

  return (
    <div className="bg-surface-1 border border-profit/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-profit/20 bg-profit/[0.02]">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-profit/15 flex items-center justify-center shrink-0">
            <Radio size={18} className="text-profit" />
          </span>
          <div>
            <p className="text-sm font-bold text-text-primary">Activate live trading</p>
            <p className="text-xs text-text-muted mt-0.5 font-mono">{sessionName}</p>
          </div>
        </div>
      </div>

      {/* Readiness gate */}
      {!allReadinessPassed && (
        <div className="mx-6 mt-5 px-4 py-3 rounded-xl border border-loss/30 bg-loss/[0.04] flex items-start gap-2">
          <AlertTriangle size={13} className="text-loss shrink-0 mt-0.5" />
          <p className="text-xs text-loss leading-snug">
            Not all readiness blockers have passed. Review the safety checklist below before activating.
          </p>
        </div>
      )}

      {/* Acknowledgment checkboxes */}
      <div className="px-6 py-5 space-y-3">
        <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Confirm you understand
        </p>
        {[
          {
            key:    "realMoney" as const,
            label:  "Real money is at risk",
            detail: "I understand that live mode places actual orders. Losses come from my real account balance.",
          },
          {
            key:    "readChecklist" as const,
            label:  "I have reviewed the safety checklist",
            detail: "I have read the strategy validation, broker, risk limits, and event guard checks above.",
          },
          {
            key:    "startSmall" as const,
            label:  "I am starting with a small allocation",
            detail: "I will not allocate more than 10% of my capital until the strategy has at least 10 live trades.",
          },
        ].map(({ key, label, detail }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={cn(
              "w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
              checks[key]
                ? "border-profit/30 bg-profit/[0.03]"
                : "border-border bg-surface-0 hover:border-border-hover hover:bg-surface-1"
            )}
          >
            <span className={cn(
              "shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all",
              checks[key]
                ? "bg-profit border-profit"
                : "bg-surface-3 border-border"
            )}>
              {checks[key] && <CheckCircle2 size={10} className="text-surface-0" />}
            </span>
            <div>
              <p className="text-xs font-semibold text-text-primary">{label}</p>
              <p className="text-2xs text-text-muted leading-snug mt-0.5">{detail}</p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-6 mb-4 px-4 py-2.5 rounded-xl border border-loss/30 bg-loss/[0.03]">
          <p className="text-xs text-loss">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          disabled={pending}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!canActivate || pending}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all",
            canActivate && !pending
              ? "bg-profit text-surface-0 hover:opacity-90 ring-2 ring-profit/20"
              : "bg-surface-3 border border-border text-text-muted cursor-not-allowed opacity-50"
          )}
        >
          {pending ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Activating…
            </>
          ) : (
            <>
              <Radio size={12} />
              Activate Live Trading
            </>
          )}
        </button>
      </div>

      {!canActivate && allChecked && !allReadinessPassed && (
        <p className="text-center text-2xs text-loss/70 pb-3">
          Resolve safety checklist blockers first
        </p>
      )}
      {!allChecked && (
        <p className="text-center text-2xs text-text-muted/50 pb-3">
          Check all three boxes to enable activation
        </p>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function LiveActivationDialog({
  sessionId, sessionName, symbol, maxCapitalPct,
  allocatedCapital, allReadinessPassed, onClose,
}: LiveActivationDialogProps) {
  const [step, setStep]   = useState<Step>("warning");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const res = await setTradingMode(sessionId, "live");
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <Overlay>
      {/* Click-outside to cancel */}
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md">
        {step === "warning" && (
          <WarningStep
            onNext={() => setStep("limits")}
            onCancel={onClose}
          />
        )}
        {step === "limits" && (
          <LimitsStep
            symbol={symbol}
            maxCapitalPct={maxCapitalPct}
            allocatedCapital={allocatedCapital}
            onNext={() => setStep("confirm")}
            onCancel={onClose}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            sessionName={sessionName}
            allReadinessPassed={allReadinessPassed}
            onConfirm={handleActivate}
            onCancel={onClose}
            pending={pending}
            error={error}
          />
        )}
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {(["warning", "limits", "confirm"] as Step[]).map((s, i) => (
            <span key={s} className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              step === s ? "bg-text-secondary scale-125" : "bg-text-muted/30"
            )} />
          ))}
        </div>
      </div>
    </Overlay>
  );
}
