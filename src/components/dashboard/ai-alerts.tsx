"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, BellRing, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppAlert, AlertSeverity } from "@/lib/alerts";

interface AiAlertsProps {
  alerts: AppAlert[];
  /** compact = inline (strategy page); full = panel with header (dashboard) */
  variant?: "full" | "compact";
}

const SEV: Record<AlertSeverity, {
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  border: string;
  leftBar: string;
  pill: string;
  pillText: string;
  label: string;
}> = {
  critical: {
    Icon: AlertCircle,
    iconBg: "bg-loss/10",
    iconColor: "text-loss",
    titleColor: "text-loss",
    border: "border-loss/20",
    leftBar: "bg-loss",
    pill: "bg-loss/10 border-loss/20",
    pillText: "text-loss",
    label: "Critical",
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    titleColor: "text-amber-300",
    border: "border-amber-500/20",
    leftBar: "bg-amber-400",
    pill: "bg-amber-500/10 border-amber-500/20",
    pillText: "text-amber-400",
    label: "Warning",
  },
  info: {
    Icon: Info,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    titleColor: "text-text-primary",
    border: "border-accent/15",
    leftBar: "bg-accent",
    pill: "bg-accent/10 border-accent/20",
    pillText: "text-accent",
    label: "Info",
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AlertCard({ alert, showStrategy }: { alert: AppAlert; showStrategy: boolean }) {
  const s = SEV[alert.severity];
  const { Icon } = s;

  return (
    <Link
      href={`/dashboard/results/${alert.runId}`}
      className={cn(
        "group relative flex items-start gap-4 rounded-xl border bg-surface-1 p-4",
        "hover:bg-surface-2 transition-colors overflow-hidden",
        s.border
      )}
    >
      {/* Left severity bar */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-full", s.leftBar)} />

      {/* Icon */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ml-1", s.iconBg)}>
        <Icon size={15} className={s.iconColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cn("text-sm font-semibold leading-snug", s.titleColor)}>
            {alert.title}
          </p>
          <span className={cn(
            "inline-flex items-center text-2xs font-semibold border rounded-full px-2 py-0.5 shrink-0",
            s.pill, s.pillText
          )}>
            {s.label}
          </span>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          {alert.message}
        </p>

        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {showStrategy && (
            <span className="text-2xs font-medium text-text-secondary truncate max-w-[140px]">
              {alert.strategyName}
            </span>
          )}
          {showStrategy && <span className="text-border">·</span>}
          <span className="text-2xs font-mono text-text-muted bg-surface-3 rounded px-1.5 py-0.5">
            {alert.symbol}
          </span>
          <span className="text-2xs text-text-muted">{timeAgo(alert.completedAt)}</span>

          <span className={cn(
            "ml-auto inline-flex items-center gap-1 text-2xs font-medium",
            "text-text-muted group-hover:text-accent transition-colors shrink-0"
          )}>
            View run <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AiAlerts({ alerts, variant = "full" }: AiAlertsProps) {
  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const hasUrgent = criticalCount > 0 || warningCount > 0;

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} showStrategy={false} />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 bg-surface-1 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            hasUrgent ? "bg-loss/10" : "bg-surface-3"
          )}>
            <BellRing size={15} className={hasUrgent ? "text-loss" : "text-text-muted"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-snug">AI Alerts</p>
            <p className="text-xs text-text-muted">
              {alerts.length} active alert{alerts.length !== 1 ? "s" : ""} across your strategies
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold bg-loss/10 text-loss border border-loss/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-loss animate-pulse" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-1">
              {warningCount} warning{warningCount > 1 ? "s" : ""}
            </span>
          )}
          {!hasUrgent && (
            <span className="text-2xs font-medium text-text-muted">
              {alerts.length} info notice{alerts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Alert cards */}
      <div className="p-4 space-y-2 bg-surface-0">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} showStrategy />
        ))}
      </div>

    </div>
  );
}
