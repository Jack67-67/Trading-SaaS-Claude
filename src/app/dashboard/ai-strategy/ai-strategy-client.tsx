"use client";

import { useTransition, useState } from "react";
import { Sparkles, ShieldCheck, Scale, Zap, Clock, TrendingUp, Rocket, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { generateAndTestStrategyAction } from "@/app/actions/ai-strategy";
import { generateStrategy } from "@/lib/ai-strategy";
import { SUPPORTED_SYMBOLS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { RiskLevel, TimeframeHorizon } from "@/lib/ai-strategy";

const RISK_OPTIONS: { value: RiskLevel; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    value: "conservative",
    label: "Conservative",
    sub: "Fewer trades, tighter filters. Capital preservation comes first.",
    icon: <ShieldCheck size={18} />,
  },
  {
    value: "balanced",
    label: "Balanced",
    sub: "Trades when confidence is high. Optimizes for risk-adjusted returns.",
    icon: <Scale size={18} />,
  },
  {
    value: "aggressive",
    label: "Aggressive",
    sub: "Acts on strong momentum. Accepts larger swings for higher upside.",
    icon: <Zap size={18} />,
  },
];

const TIMEFRAME_OPTIONS: { value: TimeframeHorizon; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    value: "short",
    label: "Short-term",
    sub: "15m–1h signals. Intraday and day-trading. Best for volatile assets.",
    icon: <Clock size={18} />,
  },
  {
    value: "medium",
    label: "Medium-term",
    sub: "Daily to weekly signals. Best for trends and mean reversion.",
    icon: <TrendingUp size={18} />,
  },
  {
    value: "long",
    label: "Long-term",
    sub: "Weekly signals. Focused on major market cycles and slow trends.",
    icon: <Rocket size={18} />,
  },
];

// Maps a strategy name to a natural-language signal description
const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  "SMA Crossover (20/50)":    "moving average crossovers",
  "SMA Crossover (50/100)":   "moving average crossovers",
  "Golden Cross (50/200)":    "the classic 50/200 Golden Cross signal",
  "MACD Crossover":           "MACD divergence and signal-line crossovers",
  "RSI Mean Reversion":       "RSI-based oversold and overbought reversals",
  "Triple EMA Trend":         "triple EMA alignment for trend confirmation",
  "Bollinger Band Breakout":  "Bollinger Band volatility expansion breakouts",
  "Momentum (ROC)":           "rate-of-change momentum bursts",
  "Volatility Breakout (ATR)":"ATR-based volatility expansion signals",
};

const SYMBOL_OPTIONS = SUPPORTED_SYMBOLS.map((s) => ({ value: s, label: s }));

export function AiStrategyClient({ initialGoal }: { initialGoal: string }) {
  const [isPending, startTransition] = useTransition();
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [timeframe, setTimeframe] = useState<TimeframeHorizon>("medium");
  const [symbol, setSymbol] = useState("SPY");
  const [goal, setGoal] = useState(initialGoal);
  const [error, setError] = useState<string | null>(null);

  const isFromSuggestion = !!initialGoal;

  const handleGenerate = () => {
    setError(null);
    const formData = new FormData();
    formData.set("risk", risk);
    formData.set("timeframe", timeframe);
    formData.set("symbol", symbol);
    formData.set("goal", goal);

    startTransition(async () => {
      const result = await generateAndTestStrategyAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  // Derive preview copy from current selections
  const preview = generateStrategy(risk, timeframe);
  const signalDesc = SIGNAL_DESCRIPTIONS[preview.name] ?? "trend signals";
  const riskLabel = { conservative: "conservative", balanced: "balanced", aggressive: "aggressive" }[risk];
  const horizonLabel = { short: "short-term", medium: "medium-term", long: "long-term" }[timeframe];

  const INTERVAL_LABELS: Record<string, string> = {
    "1m": "1-minute", "5m": "5-minute", "15m": "15-minute", "30m": "30-minute",
    "1h": "hourly", "4h": "4-hour", "1d": "daily", "1w": "weekly",
  };
  const CONTEXT_TIMEFRAME: Record<string, string> = {
    "1m": "15m", "5m": "30m", "15m": "1h", "30m": "4h",
    "1h": "4h", "4h": "1d", "1d": "1w",
  };
  const intervalLabel = INTERVAL_LABELS[preview.interval] ?? preview.interval;
  const contextInterval = CONTEXT_TIMEFRAME[preview.interval];

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
            <Sparkles size={15} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            AI Strategy Generator
          </h1>
          <span className="text-2xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
            Beta
          </span>
        </div>
        <p className="text-sm text-text-secondary ml-9 leading-relaxed">
          Describe what you want — the AI will design, code, and backtest a
          complete trading strategy in seconds.
        </p>
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-loss/10 border border-loss/20 text-sm text-loss">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Improvement context banner ───────────────────────────── */}
      {isFromSuggestion && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-yellow-400/[0.06] border border-yellow-400/20">
          <Lightbulb size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Pre-filled from a paper trading suggestion. Edit the prompt below or adjust the settings, then generate.
          </p>
        </div>
      )}

      {/* ── PRIMARY: Strategy description ───────────────────────── */}
      <div className="space-y-2">
        <label className="block text-base font-semibold text-text-primary">
          Describe your strategy in plain English
        </label>
        <p className="text-sm text-text-secondary">
          No coding needed. Just describe what you want — the AI handles the rest.
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={`e.g. "Buy SPY when it's trending up and RSI is oversold. Sell when momentum fades."`}
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder:text-text-muted/50",
            "bg-surface-1 border border-border transition-colors resize-none",
            "hover:border-border-hover focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30"
          )}
        />
        <p className="text-xs text-text-muted">
          Be specific for better results: mention the asset, signal type, or what you want to optimize.
        </p>
      </div>

      {/* ── Recommended timeframe badge ──────────────────────────── */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-1 border border-border">
        <Clock size={14} className="text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-text-secondary">
              Execute on{" "}
              <span className="font-semibold text-text-primary font-mono">{preview.interval}</span>
              <span className="text-text-muted"> ({intervalLabel} bars)</span>
            </span>
            {contextInterval && (
              <>
                <span className="text-text-muted/40 text-xs">·</span>
                <span className="text-xs text-text-muted">
                  Higher context:{" "}
                  <span className="font-semibold text-text-secondary font-mono">{contextInterval}</span>
                </span>
              </>
            )}
          </div>
          <p className="text-2xs text-text-muted mt-0.5">Based on your risk and frequency settings</p>
        </div>
      </div>

      {/* ── Secondary config ─────────────────────────────────────── */}
      <div className="space-y-6">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          Tune the strategy
        </p>

        {/* Risk level */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-secondary">
            Risk profile
          </label>
          <div className="grid grid-cols-3 gap-3">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRisk(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-150",
                  risk === opt.value
                    ? "border-accent bg-accent/8 ring-1 ring-accent/30"
                    : "border-border bg-surface-1 hover:border-border-hover hover:bg-surface-2"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  risk === opt.value ? "bg-accent/20 text-accent" : "bg-surface-3 text-text-muted"
                )}>
                  {opt.icon}
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    risk === opt.value ? "text-accent" : "text-text-primary"
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trading horizon */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-secondary">
            Trading frequency
          </label>
          <div className="grid grid-cols-3 gap-3">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeframe(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-150",
                  timeframe === opt.value
                    ? "border-accent bg-accent/8 ring-1 ring-accent/30"
                    : "border-border bg-surface-1 hover:border-border-hover hover:bg-surface-2"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  timeframe === opt.value ? "bg-accent/20 text-accent" : "bg-surface-3 text-text-muted"
                )}>
                  {opt.icon}
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    timeframe === opt.value ? "text-accent" : "text-text-primary"
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Symbol */}
        <Select
          label="Market to analyze"
          options={SYMBOL_OPTIONS}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
      </div>

      {/* ── Dynamic preview card ─────────────────────────────────── */}
      <Card className="border-accent/20 bg-accent/[0.03]">
        <div className="flex items-start gap-3">
          <Sparkles size={15} className="text-accent mt-0.5 shrink-0" />
          <div className="space-y-2.5 min-w-0">
            <p className="text-sm text-text-primary font-medium leading-relaxed">
              The AI will design a <span className="text-accent">{riskLabel}</span>{" "}
              {horizonLabel} strategy for{" "}
              <span className="text-accent font-mono">{symbol}</span> using{" "}
              {signalDesc} on <span className="text-accent">{intervalLabel}</span> data.
            </p>
            <ul className="space-y-1.5">
              {[
                `Scan historical ${symbol} price action for repeatable ${horizonLabel} patterns`,
                `Apply ${riskLabel} entry filters, stop-loss rules, and position sizing`,
                "Simulate live trading conditions and measure performance across market regimes",
                "Surface 3 behavioral insights about the strategy's real-world strengths and risks",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-text-muted">
                  <span className="w-1 h-1 rounded-full bg-accent/60 mt-1.5 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-muted pt-0.5">
              The generated strategy will be saved to your library so you can inspect, edit, or re-run it at any time.
            </p>
          </div>
        </div>
      </Card>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <Button
        size="lg"
        onClick={handleGenerate}
        loading={isPending}
        className="w-full sm:w-auto"
      >
        <Sparkles size={16} />
        {isPending ? "Generating strategy…" : "Generate & Test Strategy"}
      </Button>
    </div>
  );
}
