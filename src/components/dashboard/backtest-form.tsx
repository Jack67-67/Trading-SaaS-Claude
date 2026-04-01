"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Play, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { TIMEFRAMES, SUPPORTED_SYMBOLS } from "@/lib/constants";
import { submitBacktestAction } from "@/app/actions/backtests";
import { cn } from "@/lib/utils";

interface BacktestFormProps {
  strategies: { id: string; name: string; updated_at: string }[];
}

export function BacktestForm({ strategies }: BacktestFormProps) {
  const searchParams = useSearchParams();
  const preselectedStrategy = searchParams.get("strategy") || "";
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [strategyId, setStrategyId] = useState(preselectedStrategy);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("SPY");
  const [interval, setInterval] = useState("1d");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [entryJson, setEntryJson] = useState("{}");
  const [riskJson, setRiskJson] = useState("{}");
  const [paramsJson, setParamsJson] = useState("{}");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isValidJson = (str: string) => {
    try { JSON.parse(str); return true; } catch { return false; }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("strategy_id", strategyId);
      formData.set("name", name);
      formData.set("symbol", symbol);
      formData.set("interval", interval);
      formData.set("start", start);
      formData.set("end", end);
      formData.set("entry", entryJson);
      formData.set("risk", riskJson);
      formData.set("params", paramsJson);

      const result = await submitBacktestAction(formData);
      if (result?.error) toast("error", result.error);
    });
  };

  const strategyOptions = strategies.map((s) => ({ value: s.id, label: s.name }));
  const symbolOptions = SUPPORTED_SYMBOLS.map((s) => ({ value: s, label: s }));
  const intervalOptions = TIMEFRAMES.map((t) => ({ value: t.value, label: t.label }));

  const canSubmit = strategyId && name.trim() && symbol && interval &&
    isValidJson(entryJson) && isValidJson(riskJson) && isValidJson(paramsJson);

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle className="text-base">Configure Backtest</CardTitle></CardHeader>
      <div className="space-y-5">
        {strategies.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border bg-surface-0 text-center">
            <p className="text-sm text-text-secondary mb-1">No strategies available</p>
            <p className="text-xs text-text-muted">Create a strategy first before running a backtest.</p>
          </div>
        ) : (
          <Select label="Strategy" options={strategyOptions} value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)} placeholder="Select a strategy..." />
        )}

        <Input label="Backtest Name" placeholder="e.g. SMA Crossover — SPY daily"
          value={name} onChange={(e) => setName(e.target.value)} required />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Symbol" options={symbolOptions} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <Select label="Interval" options={intervalOptions} value={interval} onChange={(e) => setInterval(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Start Date (optional)" type="date" value={start}
            onChange={(e) => setStart(e.target.value)} hint="Leave empty for all available data" />
          <Input label="End Date (optional)" type="date" value={end}
            onChange={(e) => setEnd(e.target.value)} hint="Leave empty to use latest data" />
        </div>

        <JsonField label="Entry Config" value={entryJson} onChange={setEntryJson}
          hint="Entry logic configuration as JSON" placeholder='{"type": "market", "signal": "sma_cross"}' />

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors">
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Risk &amp; Parameters
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-border animate-fade-in">
            <JsonField label="Risk Config" value={riskJson} onChange={setRiskJson}
              hint="Risk management rules as JSON" placeholder='{"stop_loss_pct": 2, "take_profit_pct": 5}' />
            <JsonField label="Params" value={paramsJson} onChange={setParamsJson}
              hint="Strategy parameters as JSON" placeholder='{"fast_period": 10, "slow_period": 30}' />
          </div>
        )}

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-0 border border-border">
          <Info size={15} className="text-text-muted mt-0.5 shrink-0" />
          <div className="text-xs text-text-secondary leading-relaxed">
            {strategyId && name ? (
              <>Running <span className="text-text-primary font-medium">{name}</span> using{" "}
              <span className="text-text-primary font-medium">{strategies.find((s) => s.id === strategyId)?.name}</span> on{" "}
              <span className="font-mono text-text-primary">{symbol}</span> ({interval})
              {start && end ? ` from ${start} to ${end}` : start ? ` from ${start}` : end ? ` until ${end}` : " over all available data"}.</>
            ) : "Select a strategy, name your backtest, and configure parameters."}
          </div>
        </div>

        <Button onClick={handleSubmit} loading={isPending} disabled={!canSubmit} className="w-full sm:w-auto" size="lg">
          <Play size={16} />Run Backtest
        </Button>
      </div>
    </Card>
  );
}

function JsonField({ label, value, onChange, hint, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string;
}) {
  let isValid = true;
  try { JSON.parse(value); } catch { isValid = false; }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
        {value && value !== "{}" && (
          <span className={cn("text-2xs font-mono", isValid ? "text-profit" : "text-loss")}>
            {isValid ? "valid JSON" : "invalid JSON"}
          </span>
        )}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        spellCheck={false} rows={3}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted/50",
          "bg-surface-1 border transition-colors duration-150 resize-y min-h-[72px]",
          "hover:border-border-hover focus:outline-none focus:ring-1",
          isValid || value === "{}" ? "border-border focus:border-accent focus:ring-accent/30"
            : "border-loss focus:border-loss focus:ring-loss/30"
        )} />
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
