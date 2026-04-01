"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Save, Trash2, Play, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/ui/code-editor";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { STRATEGY_TEMPLATES, type StrategyTemplateKey } from "@/lib/strategy-templates";
import { createStrategy, updateStrategy, deleteStrategy } from "@/app/actions/strategies";

interface StrategyFormProps {
  mode: "create" | "edit";
  strategyId?: string;
  initialData?: { name: string; description: string | null; code: string };
}

export function StrategyForm({ mode, strategyId, initialData }: StrategyFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [code, setCode] = useState(initialData?.code ?? STRATEGY_TEMPLATES.blank.code);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const applyTemplate = (key: StrategyTemplateKey) => {
    const template = STRATEGY_TEMPLATES[key];
    if (!name || name === "Untitled Strategy") setName(template.name);
    if (!description) setDescription(template.description);
    setCode(template.code);
    markChanged();
  };

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("description", description);
      formData.set("code", code);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/strategies" className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">
              {mode === "create" ? "New Strategy" : name || "Edit Strategy"}
            </h1>
            {hasChanges && <p className="text-2xs text-amber-400 mt-0.5">Unsaved changes</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <>
              <Link href={`/dashboard/backtests?strategy=${strategyId}`}>
                <Button variant="secondary" size="sm"><Play size={14} />Run Backtest</Button>
              </Link>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-loss">Delete?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending}>Confirm</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-text-muted hover:text-loss">
                  <Trash2 size={14} />
                </Button>
              )}
            </>
          )}
          <Button size="sm" onClick={handleSave} loading={isPending} disabled={!name.trim()}>
            <Save size={14} />{mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      {mode === "create" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted mr-1">Start from:</span>
          {(Object.keys(STRATEGY_TEMPLATES) as StrategyTemplateKey[]).map((key) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                code === STRATEGY_TEMPLATES[key].code
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-surface-1 text-text-secondary hover:border-border-hover"
              )}
            >
              {STRATEGY_TEMPLATES[key].name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Input label="Strategy Name" placeholder="My Alpha Strategy" value={name}
          onChange={(e) => { setName(e.target.value); markChanged(); }} required />
        <div className="lg:col-span-2">
          <Textarea label="Description (optional)" placeholder="Describe what this strategy does..."
            value={description} onChange={(e) => { setDescription(e.target.value); markChanged(); }}
            rows={2} className="min-h-[40px]" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Strategy Code</label>
        <CodeEditor value={code} onChange={(v) => { setCode(v); markChanged(); }} language="python" minHeight={480} />
      </div>
    </div>
  );
}
