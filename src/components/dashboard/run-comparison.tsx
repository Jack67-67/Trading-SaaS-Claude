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
  leftEdge: string;
}> = {
  improving: {
    label: "Improving",
    icon: TrendingUp,
    badge: "bg-profit/10 text-profit border-profit/20",
    dot: "bg-profit",
    leftEdge: "bg-profit/50",
  },
  stable: {
    label: "Stable",
    icon: ShieldCheck,
    badge: "bg-accent/10 text-accent border-accent/20",
    dot: "bg-accent",
    leftEdge: "bg-accent/30",
  },
  "at-risk": {
    label: "At Risk",
    icon: AlertTriangle,
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    dot: "bg-amber-400",
    leftEdge: "bg-amber-400/50",
  },
  declining: {
    label: "Declining",
    icon: TrendingDown,
    badge: "bg-loss/10 text-loss border-loss/20",
    dot: "bg-loss",
    leftEdge: "bg-loss/50",
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
  const Arrow  = isFlat ? Minus : delta.direction === "up" ? TrendingUp : TrendingDown;

  return (
    <div className={cn(
      "rounded-xl border p-3 flex flex-col gap-1.5 min-w-0",
      isGood ? "border-profit/15 bg-profit/[0.025]"
      : isBad ? "border-loss/15 bg-loss/[0.025]"
      : "border-border/60 bg-surface-2/60"
    )}>
      {/* Label */}
      <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider truncate">
        {delta.label}
      </p>

      {/* Before → After */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xs font-mono text-text-muted/50 tabular-nums">
          {delta.previousFormatted}
        </span>
        <span className="text-text-muted/35 text-2xs leading-none">→</span>
        <span className={cn(
          "text-base font-mono font-bold tabular-nums leading-none",
          isGood ? "text-profit" : isBad ? "text-loss" : "text-text-primary"
        )}>
          {delta.currentFormatted}
        </span>
      </div>

      {/* Delta badge pill */}
      <span className={cn(
        "inline-flex items-center gap-0.5 text-2xs font-semibold rounded-full px-1.5 py-0.5 w-fit border",
        isGood ? "text-profit bg-profit/10 border-profit/20"
        : isBad ? "text-loss bg-loss/10 border-loss/20"
        : "text-text-muted bg-surface-3 border-border"
      )}>
        <Arrow size={8} />
        {isFlat ? "no change" : delta.deltaFormatted}
      </span>
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

  const improvedDeltas  = comparison.deltas.filter((d) => d.isPositive);
  const declinedDeltas  = comparison.deltas.filter((d) => !d.isPositive && d.direction !== "flat");
  const unchangedDeltas = comparison.deltas.filter((d) => d.direction === "flat");

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
            {/* Colored change counters */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {improvedDeltas.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-profit bg-profit/10 border border-profit/20 rounded-full px-1.5 py-0.5">
                  <TrendingUp size={8} />
                  {improvedDeltas.length} improved
                </span>
              )}
              {declinedDeltas.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-loss bg-loss/10 border border-loss/20 rounded-full px-1.5 py-0.5">
                  <TrendingDown size={8} />
                  {declinedDeltas.length} declined
                </span>
              )}
              {unchangedDeltas.length > 0 && improvedDeltas.length === 0 && declinedDeltas.length === 0 && (
                <span className="text-2xs text-text-muted">No significant changes</span>
              )}
            </div>
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

      {/* Summary — the AI's main insight */}
      <div className="px-5 py-4 border-b border-border/50">
        <p className="text-sm text-text-primary leading-relaxed font-medium">
          {comparison.summary}
        </p>
      </div>

      {/* Metric delta tiles — color-coded individually */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {comparison.deltas.map((delta) => (
          <DeltaChip key={delta.key} delta={delta} />
        ))}
      </div>

    </div>
  );
}
