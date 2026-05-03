"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Play, ChevronDown, ChevronUp, RotateCcw, AlertCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { TIMEFRAMES, SUPPORTED_SYMBOLS } from "@/lib/constants";
import { submitBacktestAction } from "@/app/actions/backtests";
import { cn } from "@/lib/utils";
import type { StrategyConfig } from "@/types";

interface StrategyWithConfig {
  id: string;
  name: string;
  updated_at: string;
  config?: StrategyConfig | null;
}

interface BacktestFormProps {
  strategies: StrategyWithConfig[];
  /** When provided, pre-fills the form with the last run's settings. */
  initialConfig?: {
    strategy_id?: string;
    symbol?: string;
    interval?: string;
    analysis_interval?: string;
    start?: string | null;
    end?: string | null;
    entry?: Record<string, unknown>;
    risk?: Record<string, unknown>;
    params?: Record<string, unknown>;
    commission_pct?: number;
    slippage_pct?: number;
  };
}

const DEFAULT_ENTRY = "{}";
const DEFAULT_RISK = "{}";
const DEFAULT_PARAMS = "{}";

function isValidJson(str: string) {
  const s = str.trim();
  if (!s) return true;
  try { JSON.parse(s); return true; } catch { return false; }
}

function jsonOrDefault(v: Record<string, unknown> | undefined, fallback: string) {
  if (!v || Object.keys(v).length === 0) return fallback;
  return JSON.stringify(v, null, 2);
}

export function BacktestForm({ strategies, initialConfig }: BacktestFormProps) {
  const searchParams = useSearchParams();
  const preselectedStrategy = initialConfig?.strategy_id || searchParams.get("strategy") || "";
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [strategyId, setStrategyId] = useState(preselectedStrategy);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState(initialConfig?.symbol || "SPY");
  const [interval, setInterval] = useState(initialConfig?.interval || "1d");
  const [analysisInterval, setAnalysisInterval] = useState(initialConfig?.analysis_interval || "");
  const [start, setStart] = useState(initialConfig?.start || "");
  const [end, setEnd] = useState(initialConfig?.end || "");
  const [entryJson, setEntryJson] = useState(jsonOrDefault(initialConfig?.entry, DEFAULT_ENTRY));
  const [riskJson, setRiskJson] = useState(jsonOrDefault(initialConfig?.risk, DEFAULT_RISK));
  const [paramsJson, setParamsJson] = useState(jsonOrDefault(initialConfig?.params, DEFAULT_PARAMS));
  const [commissionPct, setCommissionPct] = useState(
    initialConfig?.commission_pct != null ? String(initialConfig.commission_pct) : "0.1"
  );
  const [slippagePct, setSlippagePct] = useState(
    initialConfig?.slippage_pct != null ? String(initialConfig.slippage_pct) : "0.05"
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Auto-fill from strategy config when strategy changes ─────────────────
  useEffect(() => {
    if (!strategyId) return;
    const strategy = strategies.find((s) => s.id === strategyId);
    const cfg = strategy?.config;
    if (!cfg) return;

    if (cfg.symbol)             setSymbol(cfg.symbol);
    if (cfg.execution_interval) setInterval(cfg.execution_interval);
    if (cfg.analysis_interval && cfg.analysis_interval !== cfg.execution_interval) {
      setAnalysisInterval(cfg.analysis_interval);
    } else {
      setAnalysisInterval("");
    }
    if (cfg.commission_pct != null) setCommissionPct(String(cfg.commission_pct));
    if (cfg.slippage_pct   != null) setSlippagePct(String(cfg.slippage_pct));
  }, [strategyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMultiTf = !!(analysisInterval && analysisInterval !== interval);

  const handleReset = () => {
    setStrategyId(preselectedStrategy);
    setName("");
    setSymbol(initialConfig?.symbol || "SPY");
    setInterval(initialConfig?.interval || "1d");
    setAnalysisInterval(initialConfig?.analysis_interval || "");
    setStart(initialConfig?.start || "");
    setEnd(initialConfig?.end || "");
    setEntryJson(jsonOrDefault(initialConfig?.entry, DEFAULT_ENTRY));
    setRiskJson(jsonOrDefault(initialConfig?.risk, DEFAULT_RISK));
    setParamsJson(jsonOrDefault(initialConfig?.params, DEFAULT_PARAMS));
    setCommissionPct(initialConfig?.commission_pct != null ? String(initialConfig.commission_pct) : "0.1");
    setSlippagePct(initialConfig?.slippage_pct != null ? String(initialConfig.slippage_pct) : "0.05");
    setShowAdvanced(false);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("strategy_id", strategyId);
      formData.set("name", name);
      formData.set("symbol", symbol);
      formData.set("interval", interval);
      formData.set("analysis_interval", analysisInterval);
      formData.set("start", start);
      formData.set("end", end);
      formData.set("entry", entryJson);
      formData.set("risk", riskJson);
      formData.set("params", paramsJson);
      formData.set("commission_pct", commissionPct);
      formData.set("slippage_pct", slippagePct);

      const result = await submitBacktestAction(formData);
      if (result?.error) toast("error", result.error);
    });
  };

  const strategyOptions = strategies.map((s) => ({ value: s.id, label: s.name }));
  const symbolOptions = SUPPORTED_SYMBOLS.map((s) => ({ value: s, label: s }));
  const intervalOptions = TIMEFRAMES.map((t) => ({ value: t.value, label: t.label }));
  const analysisIntervalOptions = [
    { value: "", label: "None (single timeframe)" },
    ...TIMEFRAMES.map((t) => ({ value: t.value, label: t.label })),
  ];

  const jsonValid = isValidJson(entryJson) && isValidJson(riskJson) && isValidJson(paramsJson);
  const canSubmit = !!strategyId && !!name.trim() && !!symbol && !!interval && jsonValid;

  const blockingReason = !strategyId
    ? "Select a strategy"
    : !name.trim()
      ? "Enter a run name"
      : !jsonValid
        ? "Fix invalid JSON in parameters"
        : null;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Configure Backtest</CardTitle>
        {strategies.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <RotateCcw size={12} />Reset
          </button>
        )}
      </CardHeader>

      {strategies.length === 0 ? (
        <div className="py-8 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center mb-3">
            <Play size={18} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No strategies yet</p>
          <p className="text-xs text-text-muted mb-4">
            Create a strategy first before running a backtest.
          </p>
          <a href="/dashboard/strategies/new" className="text-sm text-accent hover:text-accent-hover font-medium transition-colors">
            Create a strategy →
          </a>
        </div>
      ) : (
        <div className="space-y-0">
          {/* ── Section 1: Strategy & Name ─────────────────────── */}
          <div className="pb-5 space-y-4">
            <Select
              label="Strategy"
              options={strategyOptions}
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              placeholder="Select a strategy…"
            />
            {/* Config auto-fill hint */}
            {strategyId && strategies.find((s) => s.id === strategyId)?.config && (
              <p className="text-xs text-text-muted/70 -mt-2">
                Market and cost defaults loaded from strategy settings.
              </p>
            )}
            <Input
              label="Run Name"
              placeholder="e.g. SMA Crossover — SPY daily 2020–2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint="Give this run a descriptive name so you can find it later."
              required
            />
          </div>

          <div className="border-t border-border" />

          {/* ── Section 2: Market ──────────────────────────────── */}
          <div className="py-5 space-y-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Market</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Symbol"
                options={symbolOptions}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
              <div className="space-y-1.5">
                <Select
                  label="Execution interval"
                  options={intervalOptions}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                />
              </div>
            </div>

            {/* Analysis interval (multi-timeframe) */}
            <div>
              <Select
                label="Analysis interval"
                options={analysisIntervalOptions}
                value={analysisInterval}
                onChange={(e) => setAnalysisInterval(e.target.value)}
              />
              {isMultiTf ? (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-accent/[0.06] border border-accent/20 px-3 py-2">
                  <Layers size={12} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">Multi-timeframe:</span>{" "}
                    entries/exits on <span className="font-mono text-text-primary">{interval}</span>,
                    context from <span className="font-mono text-text-primary">{analysisInterval}</span> bars.
                    The engine fetches both timeframes and makes analysis-TF data available to your strategy.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-muted mt-1.5">
                  Optional. Set a higher timeframe for context (e.g. 15m entries + 1h analysis).
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                hint="Leave empty for all available data"
              />
              <Input
                label="End Date"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                hint="Leave empty for the latest data"
              />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Section 3: Execution Costs ─────────────────────── */}
          <div className="py-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Execution Costs
              </p>
              <p className="text-xs text-text-muted mt-1">
                Applied per trade to simulate real-world fees. Results show before and after costs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Commission %"
                type="number"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                hint="Per trade leg (e.g. 0.1 = 0.1%)"
                placeholder="0.1"
              />
              <Input
                label="Slippage %"
                type="number"
                value={slippagePct}
                onChange={(e) => setSlippagePct(e.target.value)}
                hint="One-way price slippage (e.g. 0.05 = 0.05%)"
                placeholder="0.05"
              />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Section 4: Parameters ──────────────────────────── */}
          <div className="pt-5 space-y-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Parameters</p>

            <JsonField
              label="Entry Signals"
              value={entryJson}
              onChange={setEntryJson}
              hint="Signal configuration passed to your strategy's entry logic."
              placeholder='{"signal": "sma_cross", "type": "market"}'
            />

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAdvanced ? "Hide" : "Show"} Risk &amp; Strategy Params
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-border animate-fade-in">
                <JsonField
                  label="Risk Config"
                  value={riskJson}
                  onChange={setRiskJson}
                  hint="Position sizing and stop-loss rules."
                  placeholder='{"stop_loss_pct": 2, "take_profit_pct": 5, "max_position_pct": 100}'
                />
                <JsonField
                  label="Strategy Params"
                  value={paramsJson}
                  onChange={setParamsJson}
                  hint="Custom parameters read by your strategy's __init__ method."
                  placeholder='{"fast_period": 10, "slow_period": 30}'
                />
              </div>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────── */}
          <div className="pt-5 flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              loading={isPending}
              disabled={!canSubmit}
              size="lg"
              className="sm:w-auto"
            >
              <Play size={16} />
              {isPending ? "Queuing…" : "Run Backtest"}
            </Button>

            {!canSubmit && blockingReason && !isPending && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <AlertCircle size={13} />
                {blockingReason}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function JsonField({
  label, value, onChange, hint, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const trimmed = value.trim();
  const isEmpty = !trimmed;
  const valid = isValidJson(value);

  const handleFormat = () => {
    if (isEmpty) { onChange("{}"); return; }
    try {
      onChange(JSON.stringify(JSON.parse(trimmed), null, 2));
    } catch { /* leave as-is if invalid */ }
  };

  const showBadge = !isEmpty && value !== "{}";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
        <div className="flex items-center gap-2.5">
          {showBadge && (
            <span className={cn("text-2xs font-mono", valid ? "text-profit" : "text-loss")}>
              {valid ? "valid JSON" : "invalid JSON"}
            </span>
          )}
          <button
            type="button"
            onClick={handleFormat}
            className="text-2xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Format
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        rows={3}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted/50",
          "bg-surface-1 border transition-colors duration-150 resize-y min-h-[72px]",
          "hover:border-border-hover focus:outline-none focus:ring-1",
          valid
            ? "border-border focus:border-accent focus:ring-accent/30"
            : "border-loss focus:border-loss focus:ring-loss/30"
        )}
      />
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
