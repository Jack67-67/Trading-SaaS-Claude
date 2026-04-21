"use client";

import { useState, useTransition } from "react";
import { Shield, ChevronDown, ChevronUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePortfolioControls } from "@/app/actions/portfolio";

// ── Props ────────────────────────────────────────────────────────────────────

interface PortfolioRiskEngineProps {
  portfolioId:           string;
  maxPortfolioRiskPct:   number;
  maxRiskPerStrategyPct: number;
  maxSimultaneousTrades: number;
  maxWeeklyLossPct:      number;
  maxMonthlyLossPct:     number;
  pauseOnEvents:         boolean;
  // Live state
  openTradesTotal:       number;
  worstWeeklyLoss:       number | null;
  worstMonthlyLoss:      number | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PortfolioRiskEngine(props: PortfolioRiskEngineProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [maxPortRisk,    setMaxPortRisk]    = useState(props.maxPortfolioRiskPct);
  const [maxStratRisk,   setMaxStratRisk]   = useState(props.maxRiskPerStrategyPct);
  const [maxTrades,      setMaxTrades]      = useState(props.maxSimultaneousTrades);
  const [maxWeekly,      setMaxWeekly]      = useState(props.maxWeeklyLossPct);
  const [maxMonthly,     setMaxMonthly]     = useState(props.maxMonthlyLossPct);
  const [pauseEvt,       setPauseEvt]       = useState(props.pauseOnEvents);

  const weeklyUsed  = props.worstWeeklyLoss  !== null
    ? Math.min(100, (Math.abs(Math.min(0, props.worstWeeklyLoss))  / props.maxWeeklyLossPct)  * 100)
    : null;
  const monthlyUsed = props.worstMonthlyLoss !== null
    ? Math.min(100, (Math.abs(Math.min(0, props.worstMonthlyLoss)) / props.maxMonthlyLossPct) * 100)
    : null;
  const tradesUsed  = Math.min(100, (props.openTradesTotal / props.maxSimultaneousTrades) * 100);

  function saveControls() {
    setError(null);
    startTransition(async () => {
      const res = await updatePortfolioControls(props.portfolioId, {
        maxPortfolioRiskPct:    maxPortRisk,
        maxRiskPerStrategyPct:  maxStratRisk,
        maxSimultaneousTrades:  maxTrades,
        maxWeeklyLossPct:       maxWeekly,
        maxMonthlyLossPct:      maxMonthly,
        pauseOnEvents:          pauseEvt,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Status bars */}
      <div className="px-5 py-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Portfolio Risk</p>
        </div>
        <CapacityBar
          label="Open trades"
          value={props.openTradesTotal}
          max={props.maxSimultaneousTrades}
          usedPct={tradesUsed}
          suffix=""
          formatValue={v => `${v} / ${props.maxSimultaneousTrades}`}
        />
        {weeklyUsed !== null && (
          <CapacityBar
            label="Weekly loss (worst)"
            value={props.worstWeeklyLoss!}
            max={props.maxWeeklyLossPct}
            usedPct={weeklyUsed}
            suffix="%"
            formatValue={v => `${v.toFixed(1)}% / −${props.maxWeeklyLossPct}%`}
            isLoss
          />
        )}
        {monthlyUsed !== null && (
          <CapacityBar
            label="Monthly loss (worst)"
            value={props.worstMonthlyLoss!}
            max={props.maxMonthlyLossPct}
            usedPct={monthlyUsed}
            suffix="%"
            formatValue={v => `${v.toFixed(1)}% / −${props.maxMonthlyLossPct}%`}
            isLoss
          />
        )}
      </div>

      {/* Collapsible controls */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-5 py-3 hover:bg-surface-2/40 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Portfolio Limits</span>
        {open ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 bg-surface-0/50">
          <NumericField
            label="Max portfolio risk" unit="%" value={maxPortRisk} onChange={setMaxPortRisk}
            min={1} max={100} hint="Max % of total capital at risk simultaneously across all strategies"
          />
          <NumericField
            label="Max risk per strategy" unit="%" value={maxStratRisk} onChange={setMaxStratRisk}
            min={1} max={50} hint="No single strategy may risk more than this % of total capital"
          />
          <NumericField
            label="Max simultaneous trades" unit="" value={maxTrades} onChange={setMaxTrades}
            min={1} max={50} hint="Auto-pause new signals when this many trades are open across all strategies"
          />
          <NumericField
            label="Max weekly loss" unit="%" value={maxWeekly} onChange={setMaxWeekly}
            min={1} max={50} hint="Portfolio-level weekly loss threshold — triggers pause warning"
          />
          <NumericField
            label="Max monthly loss" unit="%" value={maxMonthly} onChange={setMaxMonthly}
            min={1} max={80} hint="Portfolio-level monthly loss threshold — triggers pause warning"
          />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-text-primary">Pause on major events</p>
              <p className="text-xs text-text-muted mt-0.5">Warn when FOMC, CPI, or NFP is today or tomorrow</p>
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

          <button
            disabled={pending}
            onClick={saveControls}
            className="w-full rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold py-2 hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save portfolio limits"}
          </button>
          {error && <p className="text-xs text-loss">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Capacity bar ──────────────────────────────────────────────────────────────

function CapacityBar({
  label, usedPct, formatValue, value, isLoss,
}: {
  label: string; usedPct: number; formatValue: (v: number) => string; value: number; isLoss?: boolean;
}) {
  const isCritical = usedPct >= 90;
  const isNear     = usedPct >= 70;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-text-muted flex items-center gap-1">
          {isLoss && <TrendingDown size={9} />}
          {!isLoss && <Activity size={9} />}
          {label}
        </span>
        <span className={cn(
          "text-2xs font-mono font-semibold",
          isCritical ? "text-loss" : isNear ? "text-amber-400" : "text-text-muted/70",
        )}>
          {formatValue(value)}
        </span>
      </div>
      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isCritical ? "bg-loss" : isNear ? "bg-amber-400" : "bg-accent/50",
          )}
          style={{ width: `${usedPct}%` }}
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
          {unit && <span className="text-xs text-text-muted">{unit}</span>}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full accent-accent cursor-pointer"
      />
      <p className="text-2xs text-text-muted/60 mt-1">{hint}</p>
    </div>
  );
}
