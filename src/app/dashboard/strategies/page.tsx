import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Code2, Clock, Sparkles, ChevronRight, FlaskConical, BarChart3, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const LIFECYCLE_STEPS = [
  { icon: Code2,       label: "Define",  desc: "Write your strategy" },
  { icon: FlaskConical, label: "Run",     desc: "Backtest on historical data" },
  { icon: BarChart3,   label: "Analyze", desc: "Review AI insights" },
  { icon: ShieldCheck, label: "Monitor", desc: "Track performance over time" },
];

export const metadata: Metadata = {
  title: "Strategies",
};

export default async function StrategiesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: strategies } = await supabase
    .from("strategies")
    .select("*, backtest_runs(id, status)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const items = strategies ?? [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Strategies</h1>
          <p className="text-sm text-text-secondary mt-1">
            Define and manage your Python trading strategies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <p className="text-sm text-text-muted">
              <span className="font-mono font-semibold text-text-primary">{items.length}</span>{" "}
              {items.length === 1 ? "strategy" : "strategies"}
            </p>
          )}
          <Link href="/dashboard/strategies/new">
            <Button size="sm">
              <Plus size={15} />New Strategy
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Lifecycle flow ─────────────────────────────────────── */}
      <div className="flex items-center gap-0 rounded-xl border border-border bg-surface-1 overflow-hidden">
        {LIFECYCLE_STEPS.map(({ icon: Icon, label, desc }, i) => (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0">
              <Icon size={13} className="text-accent/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary leading-none">{label}</p>
                <p className="text-2xs text-text-muted mt-0.5 leading-none truncate">{desc}</p>
              </div>
            </div>
            {i < LIFECYCLE_STEPS.length - 1 && (
              <ChevronRight size={12} className="text-border shrink-0 mr-1" />
            )}
          </div>
        ))}
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {items.length === 0 && (
        <div className="rounded-2xl bg-surface-1 border border-border flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center mb-4">
            <Code2 className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-sm font-semibold text-text-secondary mb-1">No strategies yet</p>
          <p className="text-xs text-text-muted max-w-xs mb-5 leading-relaxed">
            Write your first Python strategy, or let the AI generate and test one for you.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/dashboard/strategies/new">
              <Button size="sm"><Plus size={14} />Write a Strategy</Button>
            </Link>
            <Link href="/dashboard/ai-strategy">
              <Button variant="secondary" size="sm"><Sparkles size={14} />Generate with AI</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Strategy grid ──────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((strategy) => {
            const lineCount = strategy.code.split("\n").length;
            const runs = (strategy as Record<string, unknown> & { backtest_runs?: { id: string; status: string }[] }).backtest_runs ?? [];
            const runCount = runs.length;
            const hasCompleted = runs.some((r) => r.status === "completed");
            const hasMultiple = runs.filter((r) => r.status === "completed").length >= 2;

            const stage =
              hasMultiple  ? { label: "Monitoring",  color: "text-profit",      bg: "bg-profit/10" } :
              hasCompleted ? { label: "Analyzed",     color: "text-accent",      bg: "bg-accent/10" } :
              runCount > 0 ? { label: "Running",      color: "text-amber-400",   bg: "bg-amber-400/10" } :
                             { label: "Not yet run",  color: "text-text-muted",  bg: "bg-surface-3" };

            return (
              <Link key={strategy.id} href={`/dashboard/strategies/${strategy.id}`} className="group">
                <div className={cn(
                  "relative h-full rounded-2xl border border-border bg-surface-1 overflow-hidden",
                  "hover:border-border-hover hover:bg-surface-2/40 transition-all duration-150",
                  "flex flex-col"
                )}>
                  {/* Top accent line */}
                  <div className="absolute top-0 left-5 right-5 h-px bg-accent/50" />

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <Code2 size={15} className="text-accent" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate leading-snug">
                            {strategy.name}
                          </h3>
                          <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block", stage.bg, stage.color)}>
                            {stage.label}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0"
                      />
                    </div>

                    {/* Description */}
                    {strategy.description ? (
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {strategy.description}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted/50 italic">No description</p>
                    )}

                    {/* Code preview */}
                    <div className="flex-1 rounded-lg bg-surface-0 border border-border p-3 overflow-hidden">
                      <pre className="text-2xs text-text-muted/75 font-mono leading-relaxed line-clamp-5 whitespace-pre-wrap">
                        {strategy.code.slice(0, 260)}
                      </pre>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-2xs font-mono text-text-muted bg-surface-3 px-2 py-0.5 rounded">
                        {lineCount} lines
                      </span>
                      <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                        <Clock size={10} />
                        <span>{formatDateTime(strategy.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* "Add new" ghost card */}
          <Link href="/dashboard/strategies/new" className="group">
            <div className={cn(
              "h-full min-h-[200px] rounded-2xl border-2 border-dashed border-border",
              "hover:border-accent/40 hover:bg-accent/[0.02] transition-all duration-150",
              "flex flex-col items-center justify-center gap-2 p-5"
            )}>
              <div className="w-9 h-9 rounded-lg bg-surface-2 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
                <Plus size={16} className="text-text-muted group-hover:text-accent transition-colors" />
              </div>
              <p className="text-sm text-text-muted group-hover:text-accent transition-colors font-medium">
                New Strategy
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
