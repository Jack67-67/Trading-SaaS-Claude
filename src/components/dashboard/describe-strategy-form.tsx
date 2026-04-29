"use client";

import { useState, useTransition } from "react";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { describeStrategyAction } from "@/app/actions/ai-strategy";
import { TIMEFRAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ── Symbol groups ────────────────────────────────────────────────────────────

const SYMBOL_GROUPS = [
  {
    label: "US Stocks",
    symbols: ["SPY", "QQQ", "AAPL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "GOOGL", "AMD", "NFLX"],
  },
  { label: "Crypto",  symbols: ["BTC/USDT", "ETH/USDT"] },
  { label: "Forex",   symbols: ["EUR/USD", "GBP/USD", "USD/JPY"] },
];

// ── Interval helpers ─────────────────────────────────────────────────────────

const INTERVAL_LABELS: Record<string, string> = {
  "1m": "1-minute", "5m": "5-minute", "15m": "15-minute", "30m": "30-minute",
  "1h": "hourly", "4h": "4-hour", "1d": "daily", "1w": "weekly",
};

const CONTEXT_TIMEFRAME: Record<string, string> = {
  "1m": "15m", "5m": "30m", "15m": "1h", "30m": "4h",
  "1h": "4h", "4h": "1d", "1d": "1w",
};

function suggestInterval(text: string): string {
  const t = text.toLowerCase();
  if (/\b(scalp|intraday|day.?trad|1m|5m|15m)\b/.test(t)) return "15m";
  if (/\b(30m|thirty.?min)\b/.test(t)) return "30m";
  if (/\b(1h|hourly|hour)\b/.test(t)) return "1h";
  if (/\b(4h|four.?hour)\b/.test(t)) return "4h";
  if (/\b(weekly|1w|long.?term|invest|months?|yearly)\b/.test(t)) return "1w";
  return "1d";
}

// ── Component ────────────────────────────────────────────────────────────────

export function DescribeStrategyForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [goal, setGoal] = useState("");
  const [customName, setCustomName] = useState("");
  const [symbol, setSymbol] = useState("SPY");
  const [customSymbol, setCustomSymbol] = useState("");
  const [showIntervalOverride, setShowIntervalOverride] = useState(false);
  const [intervalOverride, setIntervalOverride] = useState<string | null>(null);

  const suggestedInterval = suggestInterval(goal);
  const effectiveInterval = intervalOverride ?? suggestedInterval;
  const contextInterval = CONTEXT_TIMEFRAME[effectiveInterval];
  const effectiveSymbol = customSymbol.trim().toUpperCase() || symbol;
  const isCustomActive = !!customSymbol.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("goal", goal.trim());
        fd.set("symbol", effectiveSymbol);
        fd.set("interval", effectiveInterval);
        if (customName.trim()) fd.set("custom_name", customName.trim());
        const result = await describeStrategyAction(fd);
        if (result?.error) setError(result.error);
        // On success the action redirects; nothing else needed here
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      }
    });
  }

  const fieldClass = cn(
    "w-full px-3.5 py-2.5 rounded-xl text-sm text-text-primary border transition-colors",
    "bg-surface-1 placeholder:text-text-muted/50",
    "hover:border-border-hover focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Description ─────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          What&apos;s your strategy idea?
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={`e.g. "Buy SPY when the 20-day MA crosses above the 50-day. Exit when price drops below the 20-day. Only trade when RSI is above 50."`}
          rows={5}
          required
          className={cn(fieldClass, "resize-none")}
          disabled={isPending}
        />
        <p className="text-xs text-text-muted mt-1.5">
          Plain English is fine. Mention indicators, conditions, or signals — the AI handles the Python code.
        </p>
      </div>

      {/* ── Optional strategy name ──────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          Strategy name <span className="text-text-muted/60 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={`e.g. "SPY Momentum Dip" — leave blank to auto-generate`}
          maxLength={80}
          className={cn(fieldClass)}
          disabled={isPending}
        />
        {!customName.trim() && (
          <p className="text-xs text-text-muted mt-1.5">
            Auto-name is generated from your symbol, signal type, and goal keywords.
          </p>
        )}
      </div>

      {/* ── Market ──────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2.5">Market</label>
        <div className="space-y-3">
          {SYMBOL_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.symbols.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => { setSymbol(sym); setCustomSymbol(""); }}
                    className={cn(
                      "text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-all",
                      symbol === sym && !isCustomActive
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface-1 text-text-secondary hover:border-border-hover hover:text-text-primary"
                    )}
                    disabled={isPending}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom symbol input */}
          <div>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Other</p>
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. GLD, TLT, COIN…"
              className={cn(
                "w-40 px-3 py-1.5 rounded-lg text-xs font-mono text-text-primary border transition-colors",
                "bg-surface-1 placeholder:text-text-muted/50",
                isCustomActive
                  ? "border-accent ring-1 ring-accent/20 text-accent"
                  : "border-border hover:border-border-hover",
                "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              )}
              disabled={isPending}
            />
            {isCustomActive && (
              <p className="text-2xs text-text-muted mt-1">
                Using <span className="font-mono text-accent">{effectiveSymbol}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Timeframe ───────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">Timeframe</label>
        <div className="rounded-xl bg-surface-1 border border-border px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-2xs text-text-muted mb-0.5">
              {intervalOverride ? "Using your selection" : "AI recommends"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold font-mono text-text-primary">{effectiveInterval}</span>
              <span className="text-xs text-text-muted">
                ({INTERVAL_LABELS[effectiveInterval] ?? effectiveInterval})
              </span>
              {contextInterval && (
                <>
                  <span className="text-text-muted/30 text-xs">·</span>
                  <span className="text-xs text-text-muted">
                    Context: <span className="font-mono font-semibold text-text-secondary">{contextInterval}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIntervalOverride((v) => !v)}
            className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors shrink-0"
          >
            Override
            <ChevronDown
              size={12}
              className={cn("transition-transform", showIntervalOverride && "rotate-180")}
            />
          </button>
        </div>

        {showIntervalOverride && (
          <div className="mt-2 flex flex-wrap gap-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() =>
                  setIntervalOverride(
                    intervalOverride === tf.value ? null : tf.value
                  )
                }
                className={cn(
                  "text-xs font-mono px-2.5 py-1 rounded-lg border transition-all",
                  effectiveInterval === tf.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-1 text-text-secondary hover:border-border-hover"
                )}
                disabled={isPending}
              >
                {tf.value}
              </button>
            ))}
            {intervalOverride && (
              <button
                type="button"
                onClick={() => setIntervalOverride(null)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Reset to AI suggestion
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-loss bg-loss/10 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* ── Submit ──────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isPending || !goal.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Generating & running backtest…
          </>
        ) : (
          <>
            <Sparkles size={14} />
            Generate &amp; Run Backtest
          </>
        )}
      </button>
    </form>
  );
}
