import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunComparison, MetricDelta, TrendLabel } from "@/lib/trends";

// ── Trend badge (reusable) ─────────────────────────────────────────────────────

export const TREND_META: Record<TrendLabel, {
  label: string;
  icon: React.ElementType;
  badge: string;
  dot: string;
}> = {
  improving: {
    label: "Improving",
    icon: TrendingUp,
    badge: "bg-profit/10 text-profit border-profit/20",
    dot: "bg-profit",
  },
  stable: {
    label: "Stable",
    icon: ShieldCheck,
    badge: "bg-accent/10 text-accent border-accent/20",
    dot: "bg-accent",
  },
  "at-risk": {
    label: "At Risk",
    icon: AlertTriangle,
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    dot: "bg-amber-400",
  },
  declining: {
    label: "Declining",
    icon: TrendingDown,
    badge: "bg-loss/10 text-loss border-loss/20",
    dot: "bg-loss",
  },
};

interface TrendBadgeProps {
  trend: TrendLabel;
  size?: "sm" | "md";
}

export function TrendBadge({ trend, size = "md" }: TrendBadgeProps) {
  const meta = TREND_META[trend];
  const Icon = meta.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-semibold border rounded-full",
      size === "sm" ? "text-2xs px-2 py-0.5" : "text-xs px-2.5 py-1",
      meta.badge
    )}>
      <Icon size={size === "sm" ? 10 : 12} />
      {meta.label}
    </span>
  );
}

// ── Delta chip ─────────────────────────────────────────────────────────────────

function DeltaChip({ delta }: { delta: MetricDelta }) {
  const isFlat = delta.direction === "flat";
  const isGood = delta.isPositive;
  const isBad  = !delta.isPositive && !isFlat;

  const Icon = isFlat ? Minus : delta.direction === "up" ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider truncate">
        {delta.label}
      </p>
      <p className={cn(
        "text-base font-mono font-bold tabular-nums leading-none",
        isGood ? "text-profit" : isBad ? "text-loss" : "text-text-primary"
      )}>
        {delta.currentFormatted}
      </p>
      <span className={cn(
        "inline-flex items-center gap-0.5 text-2xs font-semibold",
        isGood ? "text-profit" : isBad ? "text-loss" : "text-text-muted"
      )}>
        <Icon size={10} />
        {isFlat ? "no change" : delta.deltaFormatted}
      </span>
      <p className="text-2xs text-text-muted/50">prev {delta.previousFormatted}</p>
    </div>
  );
}

// ── Full comparison panel ──────────────────────────────────────────────────────

interface RunComparisonPanelProps {
  comparison: RunComparison;
  prevRunId?: string;
}

export function RunComparisonPanel({ comparison, prevRunId }: RunComparisonPanelProps) {
  const meta = TREND_META[comparison.trend];
  const Icon = meta.icon;

  const borderColor =
    comparison.trend === "improving" ? "border-profit/15" :
    comparison.trend === "at-risk"   ? "border-amber-400/20" :
    comparison.trend === "declining" ? "border-loss/15" :
    "border-border";

  const bgColor =
    comparison.trend === "improving" ? "bg-profit/[0.025]" :
    comparison.trend === "at-risk"   ? "bg-amber-400/[0.025]" :
    comparison.trend === "declining" ? "bg-loss/[0.025]" :
    "bg-surface-1";

  return (
    <div className={cn("rounded-2xl border overflow-hidden", borderColor, bgColor)}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            comparison.trend === "improving" ? "bg-profit/10" :
            comparison.trend === "at-risk"   ? "bg-amber-400/10" :
            comparison.trend === "declining" ? "bg-loss/10" :
            "bg-surface-3"
          )}>
            <Icon size={14} className={cn(
              comparison.trend === "improving" ? "text-profit" :
              comparison.trend === "at-risk"   ? "text-amber-400" :
              comparison.trend === "declining" ? "text-loss" :
              "text-accent"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-text-primary leading-snug">
                vs. Previous Run
              </p>
              <span className="inline-flex items-center gap-0.5 text-2xs text-accent/60">
                <Sparkles size={9} />
                AI
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {comparison.improvingCount} metric{comparison.improvingCount !== 1 ? "s" : ""} improved
              {comparison.decliningCount > 0 && `, ${comparison.decliningCount} declined`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TrendBadge trend={comparison.trend} />
          {prevRunId && (
            <Link
              href={`/dashboard/results/${prevRunId}`}
              className="inline-flex items-center gap-1 text-2xs text-text-muted hover:text-accent transition-colors"
            >
              View prev <ArrowRight size={10} />
            </Link>
          )}
        </div>
      </div>

      {/* Summary — the AI's main insight, given visual prominence */}
      <div className="px-5 py-4 border-b border-border/50">
        <p className="text-sm text-text-primary leading-relaxed font-medium">
          {comparison.summary}
        </p>
      </div>

      {/* Metric deltas */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-5">
        {comparison.deltas.map((delta) => (
          <DeltaChip key={delta.key} delta={delta} />
        ))}
      </div>

    </div>
  );
}
