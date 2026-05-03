"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  Save, Trash2, Play, ArrowLeft, RotateCcw,
  Sparkles, ChevronRight, Code2, BookOpen, ChevronDown, MessageSquare, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/ui/code-editor";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { STRATEGY_TEMPLATES, type StrategyTemplateKey } from "@/lib/strategy-templates";
import { createStrategy, updateStrategy, deleteStrategy } from "@/app/actions/strategies";
import { TIMEFRAMES } from "@/lib/constants";
import type { StrategyConfig } from "@/types";

interface StrategyFormProps {
  mode: "create" | "edit";
  strategyId?: string;
  initialData?: { name: string; description: string | null; code: string; config?: StrategyConfig | null };
}

// ── Default Settings panel ────────────────────────────────────────────────────

function DefaultSettings({
  config,
  onChange,
}: {
  config: StrategyConfig;
  onChange: (c: StrategyConfig) => void;
}) {
  const [open, setOpen] = useState(false);

  const set = (key: keyof StrategyConfig, value: string | number | undefined) =>
    onChange({ ...config, [key]: value });

  const hasValues = !!(
    config.symbol || config.execution_interval || config.analysis_interval ||
    config.commission_pct != null || config.slippage_pct != null
  );

  const isMultiTf = !!(
    config.analysis_interval &&
    config.execution_interval &&
    config.analysis_interval !== config.execution_interval
  );

  return (
    <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-2/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={13} className={hasValues ? "text-accent/70" : "text-text-muted/60"} />
          <span className="text-xs font-medium text-text-secondary">Default settings</span>
          {hasValues && (
            <span className="text-2xs text-text-muted/60">
              {[
                config.symbol,
                config.execution_interval,
                isMultiTf ? `+ ${config.analysis_interval} context` : null,
              ].filter(Boolean).join(" · ")}
            </span>
          )}
          {!hasValues && (
            <span className="text-2xs text-text-muted/50">market, timeframe, costs — auto-fills backtests</span>
          )}
        </div>
        <ChevronDown size={13} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4 animate-fade-in">
          <p className="text-xs text-text-muted leading-relaxed">
            These defaults auto-fill every backtest and paper session for this strategy.
            You can always override them per-run.
          </p>

          {/* Symbol + Intervals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Symbol</label>
              <input
                name="config_symbol"
                type="text"
                value={config.symbol ?? ""}
                onChange={(e) => set("symbol", e.target.value.toUpperCase() || undefined)}
                placeholder="e.g. SPY"
                className="w-full rounded-lg bg-surface-0 border border-border px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Execution interval
                <span className="ml-1 text-text-muted/50 font-normal">(entries/exits)</span>
              </label>
              <select
                name="config_execution_interval"
                value={config.execution_interval ?? ""}
                onChange={(e) => set("execution_interval", e.target.value || undefined)}
                className="w-full rounded-lg bg-surface-0 border border-border px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30 transition-colors"
              >
                <option value="">Not set</option>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Analysis interval
                <span className="ml-1 text-text-muted/50 font-normal">(context/levels)</span>
              </label>
              <select
                name="config_analysis_interval"
                value={config.analysis_interval ?? ""}
                onChange={(e) => set("analysis_interval", e.target.value || undefined)}
                className="w-full rounded-lg bg-surface-0 border border-border px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30 transition-colors"
              >
                <option value="">None (single timeframe)</option>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MTF explanation */}
          {isMultiTf && (
            <div className="rounded-lg bg-accent/[0.06] border border-accent/20 px-3 py-2.5 flex items-start gap-2">
              <span className="text-accent text-xs shrink-0 mt-0.5">MTF</span>
              <p className="text-xs text-text-secondary leading-relaxed">
                Multi-timeframe strategy: entries/exits on{" "}
                <span className="font-mono text-text-primary">{config.execution_interval}</span>, context from{" "}
                <span className="font-mono text-text-primary">{config.analysis_interval}</span> bars.
                The engine fetches both and makes the higher-TF data available in{" "}
                <code className="font-mono text-accent">on_bar()</code>.
              </p>
            </div>
          )}

          {/* Costs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Commission %</label>
              <input
                name="config_commission_pct"
                type="number"
                min="0"
                step="0.01"
                value={config.commission_pct ?? ""}
                onChange={(e) => set("commission_pct", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
                placeholder="0.1"
                className="w-full rounded-lg bg-surface-0 border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Slippage %</label>
              <input
                name="config_slippage_pct"
                type="number"
                min="0"
                step="0.01"
                value={config.slippage_pct ?? ""}
                onChange={(e) => set("slippage_pct", e.target.value !== "" ? parseFloat(e.target.value) : undefined)}
                placeholder="0.05"
                className="w-full rounded-lg bg-surface-0 border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent/30 transition-colors"
              />
            </div>
          </div>

          {/* Hidden fields so the form always submits current values */}
          <input type="hidden" name="config_symbol"             value={config.symbol ?? ""} />
          <input type="hidden" name="config_execution_interval" value={config.execution_interval ?? ""} />
          <input type="hidden" name="config_analysis_interval"  value={config.analysis_interval ?? ""} />
          <input type="hidden" name="config_commission_pct"     value={config.commission_pct ?? ""} />
          <input type="hidden" name="config_slippage_pct"       value={config.slippage_pct ?? ""} />
        </div>
      )}

      {/* Always-present hidden fields when panel is closed */}
      {!open && (
        <>
          <input type="hidden" name="config_symbol"             value={config.symbol ?? ""} />
          <input type="hidden" name="config_execution_interval" value={config.execution_interval ?? ""} />
          <input type="hidden" name="config_analysis_interval"  value={config.analysis_interval ?? ""} />
          <input type="hidden" name="config_commission_pct"     value={config.commission_pct ?? ""} />
          <input type="hidden" name="config_slippage_pct"       value={config.slippage_pct ?? ""} />
        </>
      )}
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  templateKey,
  active,
  onSelect,
}: {
  templateKey: StrategyTemplateKey;
  active: boolean;
  onSelect: () => void;
}) {
  const t = STRATEGY_TEMPLATES[templateKey];
  const isBlank = templateKey === "blank";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all duration-150",
        "hover:border-accent/50 hover:bg-accent/[0.03]",
        active
          ? "border-accent bg-accent/[0.06] ring-1 ring-accent/30"
          : "border-border bg-surface-1",
        isBlank && "border-dashed"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={cn("text-sm font-semibold", active ? "text-accent" : "text-text-primary")}>
          {t.name}
        </p>
        <span className={cn(
          "text-2xs font-medium px-1.5 py-0.5 rounded-full border shrink-0",
          t.difficulty === "beginner"
            ? "bg-profit/10 text-profit border-profit/20"
            : "bg-amber-400/10 text-amber-400 border-amber-400/20"
        )}>
          {t.difficulty}
        </span>
      </div>
      <p className="text-2xs text-text-muted leading-relaxed">{t.tagline}</p>
    </button>
  );
}

// ── API reference guide ───────────────────────────────────────────────────────

function ApiGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-2/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-accent/70" />
          <span className="text-xs font-medium text-text-secondary">Strategy API reference</span>
        </div>
        <ChevronDown size={13} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* bar keys */}
          <div className="pt-3">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Bar data — available inside on_bar()
            </p>
            <div className="space-y-1.5">
              {[
                ["bar[\"close\"]",     "Today's closing price"],
                ["bar[\"open\"]",      "Today's opening price"],
                ["bar[\"high\"]",      "Today's highest price"],
                ["bar[\"low\"]",       "Today's lowest price"],
                ["bar[\"volume\"]",    "Number of shares traded"],
                ["bar[\"symbol\"]",    "The ticker, e.g. \"SPY\""],
                ["bar[\"timestamp\"]", "Date string, e.g. \"2024-01-15\""],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-3">
                  <code className="text-2xs font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                    {key}
                  </code>
                  <span className="text-2xs text-text-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* portfolio methods */}
          <div>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Portfolio methods
            </p>
            <div className="space-y-2">
              {[
                {
                  sig: "portfolio.order_target_percent(symbol, pct)",
                  desc: "Set how much of your portfolio to hold in this asset.",
                  examples: ["1.0 = 100% invested (fully long)", "0.5 = 50% of portfolio", "0.0 = exit to cash"],
                },
                {
                  sig: "portfolio.get_position(symbol)",
                  desc: "Returns the number of shares you currently hold (0 if flat).",
                  examples: [],
                },
              ].map(({ sig, desc, examples }) => (
                <div key={sig} className="rounded-lg bg-surface-0 border border-border p-3">
                  <code className="text-2xs font-mono text-accent block mb-1">{sig}</code>
                  <p className="text-2xs text-text-muted mb-1.5">{desc}</p>
                  {examples.map((ex) => (
                    <p key={ex} className="text-2xs text-text-muted/60 font-mono leading-relaxed">· {ex}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* quick example */}
          <div>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Minimal working example
            </p>
            <pre className="text-2xs font-mono text-text-secondary bg-surface-0 border border-border rounded-lg p-3 leading-relaxed overflow-x-auto">{`class Strategy:
    def __init__(self, params):
        self.period = params.get("period", 20)
        self.closes = []

    def on_bar(self, bar, portfolio):
        self.closes.append(bar["close"])
        if len(self.closes) < self.period:
            return  # not enough data yet
        sma = sum(self.closes[-self.period:]) / self.period
        if bar["close"] > sma:
            portfolio.order_target_percent(bar["symbol"], 1.0)
        else:
            portfolio.order_target_percent(bar["symbol"], 0.0)`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function StrategyForm({ mode, strategyId, initialData }: StrategyFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // In create mode we start at the "choose a path" screen
  const [startMode, setStartMode] = useState<"choose" | "ready">(
    mode === "create" ? "choose" : "ready"
  );

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [code, setCode] = useState(initialData?.code ?? STRATEGY_TEMPLATES.blank.code);
  const [config, setConfig] = useState<StrategyConfig>(initialData?.config ?? {});
  const [activeTemplate, setActiveTemplate] = useState<StrategyTemplateKey | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const applyTemplate = (key: StrategyTemplateKey) => {
    const template = STRATEGY_TEMPLATES[key];
    if (!name || name === "Untitled Strategy") setName(template.name);
    if (!description) setDescription(template.description);
    setCode(template.code);
    setActiveTemplate(key);
    markChanged();
  };

  const handleDiscard = () => {
    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
    setCode(initialData?.code ?? STRATEGY_TEMPLATES.blank.code);
    setConfig(initialData?.config ?? {});
    setHasChanges(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("description", description);
      formData.set("code", code);
      // Config fields
      formData.set("config_symbol",             config.symbol             ?? "");
      formData.set("config_execution_interval", config.execution_interval ?? "");
      formData.set("config_analysis_interval",  config.analysis_interval  ?? "");
      formData.set("config_commission_pct",     config.commission_pct     != null ? String(config.commission_pct) : "");
      formData.set("config_slippage_pct",       config.slippage_pct       != null ? String(config.slippage_pct)   : "");

      if (mode === "create") {
        const result = await createStrategy(formData);
        if (result?.error) toast("error", result.error);
      } else if (strategyId) {
        const result = await updateStrategy(strategyId, formData);
        if (result?.error) toast("error", result.error);
        else { toast("success", "Strategy saved."); setHasChanges(false); }
      }
    });
  };

  const handleDelete = () => {
    if (!strategyId) return;
    startTransition(async () => {
      const result = await deleteStrategy(strategyId);
      if (result?.error) toast("error", result.error);
    });
  };

  // ── "Choose a path" screen (create mode only) ───────────────────────────────
  if (mode === "create" && startMode === "choose") {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/strategies"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">New Strategy</h1>
            <p className="text-xs text-text-muted mt-0.5">How do you want to get started?</p>
          </div>
        </div>

        {/* Two primary paths */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Path 1: Describe your strategy (primary) */}
          <Link href="/dashboard/strategies/describe">
            <div className={cn(
              "group relative rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] via-surface-1 to-surface-1",
              "hover:border-accent/50 hover:from-accent/[0.12] transition-all duration-150",
              "p-5 cursor-pointer overflow-hidden h-full flex flex-col"
            )}>
              <span className="absolute top-3.5 right-3.5 text-2xs font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                Fastest
              </span>
              <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center mb-3 shrink-0">
                <MessageSquare size={16} className="text-accent" />
              </div>
              <h2 className="text-sm font-bold text-text-primary mb-1.5">Describe your strategy</h2>
              <p className="text-xs text-text-secondary leading-relaxed flex-1">
                Have a specific idea? Write it in plain English. AI interprets it, picks the right approach, and runs a backtest — no configuration needed.
              </p>
              <p className="text-xs text-accent font-medium mt-3 flex items-center gap-1">
                &ldquo;Buy when RSI crosses below 30&rdquo;
                <ChevronRight size={11} />
              </p>
            </div>
          </Link>

          {/* Path 2: AI Strategy Generator */}
          <Link href="/dashboard/ai-strategy">
            <div className={cn(
              "group relative rounded-2xl border border-border bg-surface-1",
              "hover:border-border-hover hover:bg-surface-2/40 transition-all duration-150",
              "p-5 cursor-pointer h-full flex flex-col"
            )}>
              <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center mb-3 shrink-0">
                <Sparkles size={16} className="text-text-muted" />
              </div>
              <h2 className="text-sm font-bold text-text-primary mb-1.5">AI Strategy Generator</h2>
              <p className="text-xs text-text-secondary leading-relaxed flex-1">
                Let AI suggest a strategy. Choose your risk profile (conservative / balanced / aggressive) and trading frequency.
              </p>
              <p className="text-xs text-text-muted font-medium mt-3 flex items-center gap-1">
                Pick a style, get a working strategy
                <ChevronRight size={11} />
              </p>
            </div>
          </Link>
        </div>

        {/* Templates — secondary path */}
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Or start from a template
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["sma_crossover", "rsi", "momentum", "mean_reversion"] as StrategyTemplateKey[]).map((key) => (
              <TemplateCard
                key={key}
                templateKey={key}
                active={false}
                onSelect={() => {
                  applyTemplate(key);
                  setStartMode("ready");
                }}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3 leading-relaxed">
            Templates are fully working strategies. Pick one, give it a name, and save — you can run a backtest immediately.
          </p>
        </div>

        {/* Blank — tertiary */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <button
            onClick={() => {
              applyTemplate("blank");
              setStartMode("ready");
            }}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1.5"
          >
            <Code2 size={12} />
            Start from scratch
          </button>
          <div className="flex-1 h-px bg-border" />
        </div>

      </div>
    );
  }

  // ── Full editor (create ready / edit mode) ──────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {mode === "create" ? (
            <button
              onClick={() => setStartMode("choose")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Link
              href="/dashboard/strategies"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">
              {mode === "create" ? (name || "New Strategy") : (name || "Edit Strategy")}
            </h1>
            {mode === "edit" && (
              <p className={cn(
                "text-2xs mt-0.5 transition-colors",
                hasChanges ? "text-amber-400" : "text-text-muted"
              )}>
                {hasChanges ? "Unsaved changes" : "All changes saved"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <>
              <Link href={`/dashboard/backtests?strategy=${strategyId}`}>
                <Button variant="secondary" size="sm">
                  <Play size={14} />Run Backtest
                </Button>
              </Link>

              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isPending}>
                  <RotateCcw size={14} />Discard
                </Button>
              )}

              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-loss">Delete?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending}>
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-text-muted hover:text-loss"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            loading={isPending}
            disabled={!name.trim()}
            className={cn(hasChanges && mode === "edit" && "ring-1 ring-amber-400/40")}
          >
            <Save size={14} />
            {mode === "create" ? "Create Strategy" : "Save"}
          </Button>
        </div>
      </div>

      {/* Template switcher (create mode) */}
      {mode === "create" && (
        <div>
          <p className="text-2xs text-text-muted mb-2">Template:</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(STRATEGY_TEMPLATES) as StrategyTemplateKey[]).map((key) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  activeTemplate === key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-1 text-text-secondary hover:border-border-hover"
                )}
              >
                {STRATEGY_TEMPLATES[key].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name + Description */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Input
          label="Strategy Name"
          placeholder="My Alpha Strategy"
          value={name}
          onChange={(e) => { setName(e.target.value); markChanged(); }}
          required
        />
        <Textarea
          label="Description (optional)"
          placeholder="What does this strategy do? What signals does it use?"
          value={description}
          onChange={(e) => { setDescription(e.target.value); markChanged(); }}
          rows={1}
        />
      </div>

      {/* Default settings */}
      <DefaultSettings
        config={config}
        onChange={(c) => { setConfig(c); markChanged(); }}
      />

      {/* Code editor */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Strategy Code
        </label>
        <CodeEditor
          value={code}
          onChange={(v) => { setCode(v); markChanged(); }}
          language="python"
          minHeight={480}
        />
      </div>

      {/* API reference guide */}
      <ApiGuide />

    </div>
  );
}
