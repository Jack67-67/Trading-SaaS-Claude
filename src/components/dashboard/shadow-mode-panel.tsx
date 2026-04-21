"use client";

import { Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────────

interface ShadowModePanelProps {
  symbol:         string;
  interval:       string;
  hasSignal:      boolean;
  signalReason:   string | null;
  entryApprox:    number | null;
  stopLoss:       number | null;
  positionSize:   number | null;
  riskAmount:     number | null;
  confidence:     "high" | "medium" | "low" | null;
  tradeCount:     number;     // total trades in simulation history
  winRate:        number | null;
  profitFactor:   number | null;
}

// ── Component ───────────────────────────────────────────────────────────────────

export function ShadowModePanel({
  symbol, interval, hasSignal, signalReason,
  entryApprox, stopLoss, positionSize, riskAmount,
  confidence, tradeCount, winRate, profitFactor,
}: ShadowModePanelProps) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/[0.02] overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-accent/20 bg-accent/[0.03] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye size={13} className="text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">
            Shadow Mode — Dry Run Active
          </span>
        </div>
        <span className="text-2xs font-bold text-accent/70 bg-accent/10 border border-dashed border-accent/30 rounded-full px-2.5 py-0.5">
          SIMULATION · NO REAL ORDERS
        </span>
      </div>

      {/* Explanation */}
      <div className="px-5 py-4 border-b border-accent/15">
        <p className="text-xs text-text-secondary leading-relaxed">
          Shadow mode mirrors real execution behavior exactly — signals are generated, entry/exit prices are computed,
          and position sizes are calculated using your live risk rules. The only difference is{" "}
          <span className="font-semibold text-text-primary">no orders are sent to your broker.</span>
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Signal generation",   value: "Real",       color: "text-profit" },
            { label: "Price computation",   value: "Real",       color: "text-profit" },
            { label: "Order submission",    value: "Blocked",    color: "text-accent" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={cn("text-sm font-bold", color)}>{value}</p>
              <p className="text-2xs text-text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Current signal status */}
      <div className="px-5 py-4 border-b border-accent/15">
        <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-3">
          Current Signal
        </p>
        {hasSignal && entryApprox !== null ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className={cn(
                "shrink-0 text-2xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider mt-0.5",
                confidence === "high"   ? "text-profit bg-profit/10 border-profit/20"
                : confidence === "medium" ? "text-accent bg-accent/10 border-accent/20"
                : "text-text-muted bg-surface-3 border-border"
              )}>
                {confidence ?? "signal"} confidence
              </span>
              {signalReason && (
                <p className="text-xs text-text-secondary leading-relaxed">{signalReason}</p>
              )}
            </div>
            {stopLoss !== null && positionSize !== null && riskAmount !== null && (
              <div className="grid grid-cols-4 gap-3 bg-surface-2/50 rounded-xl border border-accent/15 px-4 py-3">
                {[
                  { label: "Would enter at",  value: `$${entryApprox.toFixed(2)}`,  sub: "approx market" },
                  { label: "Stop loss",        value: `$${stopLoss.toFixed(2)}`,     sub: `−${(((entryApprox - stopLoss) / entryApprox) * 100).toFixed(2)}%` },
                  { label: "Position size",    value: `${positionSize} sh`,          sub: `~$${(entryApprox * positionSize).toLocaleString()}` },
                  { label: "Risk amount",      value: `$${riskAmount.toFixed(0)}`,   sub: "max loss" },
                ].map(({ label, value, sub }) => (
                  <div key={label}>
                    <p className="text-2xs text-text-muted mb-0.5">{label}</p>
                    <p className="text-xs font-bold font-mono text-text-primary">{value}</p>
                    <p className="text-2xs text-text-muted/60 font-mono">{sub}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-2xs text-accent/70 flex items-center gap-1.5">
              <Eye size={10} />
              In live mode, this order would be submitted to your broker automatically.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
            <p className="text-xs">No signal at this time — strategy is scanning for entry conditions.</p>
          </div>
        )}
      </div>

      {/* Simulation track record */}
      {tradeCount > 0 && (
        <div className="px-5 py-3.5 border-b border-accent/15">
          <p className="text-2xs text-text-muted uppercase tracking-wider font-semibold mb-2.5">
            Simulation Track Record
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-sm font-bold font-mono text-text-primary">{tradeCount}</p>
              <p className="text-2xs text-text-muted">simulated trades</p>
            </div>
            {winRate !== null && (
              <div>
                <p className={cn("text-sm font-bold font-mono", winRate >= 50 ? "text-profit" : "text-loss")}>
                  {winRate.toFixed(0)}%
                </p>
                <p className="text-2xs text-text-muted">win rate</p>
              </div>
            )}
            {profitFactor !== null && (
              <div>
                <p className={cn("text-sm font-bold font-mono", profitFactor > 1 ? "text-profit" : "text-loss")}>
                  {profitFactor.toFixed(2)}
                </p>
                <p className="text-2xs text-text-muted">profit factor</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* What's next */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="space-y-1">
          {[
            "Strategy is behaving as expected — signals match backtest logic.",
            "When confident, advance to Live Prep to enable broker order preview.",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={11} className="text-accent/60 shrink-0 mt-0.5" />
              <p className="text-2xs text-text-muted leading-snug">{item}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-muted/50 shrink-0">
          <span>Live Prep</span>
          <ArrowRight size={9} />
          <span>Live</span>
        </div>
      </div>

    </div>
  );
}
