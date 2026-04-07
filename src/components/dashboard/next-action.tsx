import Link from "next/link";
import {
  AlertCircle, AlertTriangle, TrendingUp, TrendingDown,
  Play, CheckCircle2, Search, ArrowRight, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextActionItem, ActionPriority, ActionIcon } from "@/lib/next-actions";

// ── Style maps ────────────────────────────────────────────────────────────────

const PRIORITY: Record<ActionPriority, {
  border: string;
  bg: string;
  leftBar: string;
  iconBg: string;
  iconColor: string;
  label: string;
  labelCls: string;
  ctaCls: string;
}> = {
  urgent: {
    border: "border-loss/25",
    bg: "bg-loss/[0.025]",
    leftBar: "bg-loss",
    iconBg: "bg-loss/10",
    iconColor: "text-loss",
    label: "Action Required",
    labelCls: "text-loss bg-loss/10 border-loss/20",
    ctaCls: "text-loss hover:text-loss/80",
  },
  important: {
    border: "border-amber-400/25",
    bg: "bg-amber-400/[0.025]",
    leftBar: "bg-amber-400",
    iconBg: "bg-amber-400/10",
    iconColor: "text-amber-400",
    label: "Recommended",
    labelCls: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    ctaCls: "text-amber-400 hover:text-amber-300",
  },
  suggested: {
    border: "border-accent/20",
    bg: "bg-accent/[0.02]",
    leftBar: "bg-accent/60",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    label: "Next Step",
    labelCls: "text-accent bg-accent/10 border-accent/20",
    ctaCls: "text-accent hover:text-accent-hover",
  },
};

const ICONS: Record<ActionIcon, React.ElementType> = {
  "alert-critical": AlertCircle,
  "alert-warning":  AlertTriangle,
  "trending-up":    TrendingUp,
  "trending-down":  TrendingDown,
  "play":           Play,
  "check":          CheckCircle2,
  "search":         Search,
};

// ── Single action card ────────────────────────────────────────────────────────

function ActionCard({ action }: { action: NextActionItem }) {
  const s = PRIORITY[action.priority];
  const Icon = ICONS[action.icon];

  return (
    <div className={cn(
      "relative flex items-start gap-4 rounded-xl border p-4 overflow-hidden",
      s.border, s.bg
    )}>
      {/* Left severity bar */}
      <span className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full", s.leftBar)} />

      {/* Icon */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-1 mt-0.5", s.iconBg)}>
        <Icon size={15} className={s.iconColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="text-sm font-semibold text-text-primary leading-snug">{action.title}</p>
          <span className={cn(
            "text-2xs font-semibold border rounded-full px-2 py-0.5 shrink-0",
            s.labelCls
          )}>
            {s.label}
          </span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed mb-2.5">
          {action.description}
        </p>
        <Link
          href={action.href}
          className={cn("inline-flex items-center gap-1 text-xs font-semibold transition-colors", s.ctaCls)}
        >
          {action.cta} <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NextActionProps {
  actions: NextActionItem[];
}

export function NextAction({ actions }: NextActionProps) {
  if (actions.length === 0) return null;

  const hasUrgent = actions.some((a) => a.priority === "urgent");

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-3.5 border-b border-border",
        hasUrgent ? "bg-loss/[0.025]" : "bg-surface-1"
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            hasUrgent ? "bg-loss/10" : "bg-accent/10"
          )}>
            <Zap size={13} className={hasUrgent ? "text-loss" : "text-accent"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">What to Do Next</p>
            <p className="text-xs text-text-muted mt-0.5">
              {hasUrgent
                ? "Urgent items need your attention"
                : "Prioritized actions based on your results"}
            </p>
          </div>
        </div>
        <span className="text-2xs text-text-muted font-mono">
          {actions.length} action{actions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Action cards */}
      <div className="p-4 space-y-2 bg-surface-0">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}
