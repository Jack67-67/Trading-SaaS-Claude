"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPaperTradingSession } from "@/app/actions/paper-trading";
import { TIMEFRAMES } from "@/lib/constants";
import { Layers, Loader2, ChevronDown } from "lucide-react";
import type { StrategyConfig } from "@/types";

interface StrategyWithConfig {
  id: string;
  name: string;
  config?: StrategyConfig | null;
}

interface Props {
  strategies: StrategyWithConfig[];
}

// ── Symbol data ──────────────────────────────────────────────────────────────

const SYMBOL_GROUPS = [
  {
    label: "US Stocks",
    symbols: ["SPY", "QQQ", "AAPL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "GOOGL", "AMD", "NFLX"],
  },
  { label: "Crypto", symbols: ["BTC/USDT", "ETH/USDT"] },
  { label: "Forex",  symbols: ["EUR/USD", "GBP/USD", "USD/JPY"] },
];

const ALL_SYMBOLS = SYMBOL_GROUPS.flatMap((g) => g.symbols);

// ── Symbol Picker ────────────────────────────────────────────────────────────

function SymbolPicker({
  disabled, fieldClass, value, onChange,
}: {
  disabled: boolean;
  fieldClass: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const query = value.toUpperCase();
  const filtered = SYMBOL_GROUPS.map((g) => ({
    label: g.label,
    symbols: g.symbols.filter((s) => s.includes(query)),
  })).filter((g) => g.symbols.length > 0);

  const isCustom = value !== "" && !ALL_SYMBOLS.includes(value.toUpperCase());

  return (
    <div ref={containerRef} className="relative">
      <input
        name="symbol"
        required
        autoComplete="off"
        value={value}
        onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="SPY, AAPL, BTC/USDT…"
        className={fieldClass + " pr-8"}
        disabled={disabled}
      />
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/40 pointer-events-none"
      />

      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-surface-2 shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-text-muted">
              No matching symbol —{" "}
              <span className="font-mono text-text-secondary">{value}</span>{" "}
              will be sent to the backend directly.
            </p>
          ) : (
            filtered.map((group) => (
              <div key={group.label}>
                <p className="px-3 pt-2.5 pb-1 text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                  {group.symbols.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(sym);
                        setOpen(false);
                      }}
                      className="text-xs font-mono px-2 py-1 rounded-lg bg-surface-3 text-text-secondary hover:bg-accent/20 hover:text-accent transition-colors"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
          {isCustom && (
            <p className="px-3 pb-2.5 text-2xs text-text-muted border-t border-border pt-2">
              <span className="font-mono text-text-secondary">{value}</span> will be passed to the backend as-is
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export function NewPaperSessionForm({ strategies }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Controlled fields that can be auto-filled from strategy config
  const [selectedStrategyId, setSelectedStrategyId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [interval, setInterval] = useState("1d");
  const [analysisInterval, setAnalysisInterval] = useState("");
  const [commissionPct, setCommissionPct] = useState("0.1");
  const [slippagePct, setSlippagePct] = useState("0.05");
  const [initialCapital, setInitialCapital] = useState("100000");

  const defaultStart = new Date();
  defaultStart.setFullYear(defaultStart.getFullYear() - 1);
  const defaultStartStr = defaultStart.toISOString().slice(0, 10);

  // Auto-fill from strategy config when strategy changes
  useEffect(() => {
    if (!selectedStrategyId) return;
    const strategy = strategies.find((s) => s.id === selectedStrategyId);
    const cfg = strategy?.config;
    if (!cfg) return;

    if (cfg.symbol)             setSymbol(cfg.symbol);
    if (cfg.execution_interval) setInterval(cfg.execution_interval);
    if (cfg.analysis_interval && cfg.analysis_interval !== cfg.execution_interval) {
      setAnalysisInterval(cfg.analysis_interval);
    } else {
      setAnalysisInterval("");
    }
    if (cfg.commission_pct  != null) setCommissionPct(String(cfg.commission_pct));
    if (cfg.slippage_pct    != null) setSlippagePct(String(cfg.slippage_pct));
    if (cfg.initial_capital != null) setInitialCapital(String(cfg.initial_capital));
  }, [selectedStrategyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMultiTf = !!(analysisInterval && analysisInterval !== interval);
  const hasConfig = !!(strategies.find((s) => s.id === selectedStrategyId)?.config);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createPaperTradingSession({
          strategyId:      fd.get("strategyId") as string,
          name:            fd.get("name") as string,
          symbol:          symbol || (fd.get("symbol") as string),
          interval,
          analysisInterval: analysisInterval || undefined,
          startDate:       fd.get("startDate") as string,
          params:          {},
          risk:            {},
          commissionPct:   parseFloat(commissionPct) || 0,
          slippagePct:     parseFloat(slippagePct)   || 0,
          initialCapital:  parseFloat(initialCapital) || 100000,
        });
        if ("error" in res) {
          setError(res.error);
        } else {
          router.push(`/dashboard/paper-trading/${res.sessionId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      }
    });
  }

  const fieldClass =
    "w-full rounded-xl bg-surface-1 border border-border px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors";
  const labelClass = "block text-xs font-semibold text-text-secondary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Session name */}
      <div>
        <label htmlFor="name" className={labelClass}>Session Name</label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. AAPL Momentum — Paper"
          className={fieldClass}
          disabled={pending}
        />
      </div>

      {/* Strategy */}
      <div>
        <label htmlFor="strategyId" className={labelClass}>Strategy</label>
        <select
          id="strategyId"
          name="strategyId"
          required
          value={selectedStrategyId}
          onChange={(e) => setSelectedStrategyId(e.target.value)}
          className={fieldClass}
          disabled={pending}
        >
          <option value="">Select a strategy…</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {selectedStrategyId && hasConfig && (
          <p className="text-2xs text-text-muted/70 mt-1.5">
            Market and cost defaults loaded from strategy settings.
          </p>
        )}
      </div>

      {/* Symbol + Interval */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Symbol</label>
          <SymbolPicker disabled={pending} fieldClass={fieldClass} value={symbol} onChange={setSymbol} />
        </div>
        <div>
          <label className={labelClass}>Execution interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className={fieldClass}
            disabled={pending}
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Analysis interval (MTF) */}
      <div>
        <label className={labelClass}>
          Analysis interval{" "}
          <span className="text-text-muted/50 font-normal">(optional — context/levels)</span>
        </label>
        <select
          value={analysisInterval}
          onChange={(e) => setAnalysisInterval(e.target.value)}
          className={fieldClass}
          disabled={pending}
        >
          <option value="">None (single timeframe)</option>
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value}>{tf.label}</option>
          ))}
        </select>
        {isMultiTf && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-accent/[0.06] border border-accent/20 px-3 py-2">
            <Layers size={12} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">Multi-timeframe:</span>{" "}
              entries/exits on <span className="font-mono text-text-primary">{interval}</span>,
              context from <span className="font-mono text-text-primary">{analysisInterval}</span>.
            </p>
          </div>
        )}
      </div>

      {/* Start date */}
      <div>
        <label htmlFor="startDate" className={labelClass}>Simulation Start Date</label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          required
          defaultValue={defaultStartStr}
          max={new Date().toISOString().slice(0, 10)}
          className={fieldClass}
          disabled={pending}
        />
        <p className="text-2xs text-text-muted mt-1.5">
          The simulation runs from this date to <strong>today</strong>. Longer periods give more data points.
        </p>
      </div>

      {/* Capital + costs */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Execution Settings</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Capital ($)</label>
            <input
              type="number"
              min="100"
              step="100"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className={fieldClass}
              disabled={pending}
            />
          </div>
          <div>
            <label className={labelClass}>Commission %</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className={fieldClass}
              disabled={pending}
            />
          </div>
          <div>
            <label className={labelClass}>Slippage %</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={slippagePct}
              onChange={(e) => setSlippagePct(e.target.value)}
              className={fieldClass}
              disabled={pending}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-loss bg-loss/10 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover shadow-glow-sm hover:shadow-glow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Starting simulation…
          </>
        ) : (
          "Start Paper Session"
        )}
      </button>
    </form>
  );
}
