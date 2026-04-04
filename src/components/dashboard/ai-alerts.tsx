"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, Bell, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppAlert, AlertSeverity } from "@/lib/alerts";

interface AiAlertsProps {
  alerts: AppAlert[];
  /** compact = inline list (strategy page); full = panel with header (dashboard) */
  variant?: "full" | "compact";
}

const SEVERITY_META: Record<AlertSeverity, {
  icon: React.ElementType;
  label: string;
  bg: string;
  border: string;
  iconColor: string;
  titleColor: string;
  dot: string;
}> = {
  critical: {
    icon: AlertCircle,
    label: "Critical",
    bg: "bg-loss/[0.04]",
    border: "border-loss/25",
    iconColor: "text-loss",
    titleColor: "text-loss",
    dot: "bg-loss",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    bg: "bg-amber-500/[0.04]",
    border: "border-amber-500/25",
    iconColor: "text-amber-400",
    titleColor: "text-amber-300",
    dot: "bg-amber-400",
  },
  info: {
    icon: Info,
    label: "Info",
    bg: "bg-accent/[0.04]",
    border: "border-accent/20",
    iconColor: "text-accent",
    titleColor: "text-text-primary",
    dot: "bg-accent",
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

function AlertRow({ alert, compact }: { alert: AppAlert; compact: boolean }) {
  const meta = SEVERITY_META[alert.severity];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
        meta.bg,
        meta.border,
        compact ? "p-3" : "p-3.5"
      )}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 shrink-0", meta.iconColor)}>
        <Icon size={15} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn("text-sm font-semibold leading-snug", meta.titleColor)}>
          {alert.title}
        </p>
        <p className="text-xs text-text-muted leading-relaxed">
          {alert.message}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {!compact && (
            <span className="inline-flex items-center gap-1 text-2xs font-medium text-text-muted bg-surface-3 rounded px-1.5 py-0.5">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
              {alert.strategyName}
            </span>
          )}
          <span className="text-2xs font-mono text-text-muted bg-surface-2 rounded px-1.5 py-0.5">
            {alert.symbol}
          </span>
          <span className="text-2xs text-text-muted">
            {timeAgo(alert.completedAt)}
          </span>
          <Link
            href={`/dashboard/results/${alert.runId}`}
            className="ml-auto inline-flex items-center gap-1 text-2xs font-medium text-accent hover:text-accent-hover transition-colors shrink-0"
          >
            View run <ExternalLink size={10} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AiAlerts({ alerts, variant = "full" }: AiAlertsProps) {
  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-surface-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-loss/10 flex items-center justify-center shrink-0">
            <Bell size={14} className="text-loss" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">AI Alerts</p>
            <p className="text-2xs text-text-muted">
              Performance monitoring across your strategies
            </p>
          </div>
        </div>

        {/* Badge chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold bg-loss/10 text-loss border border-loss/20 rounded-full px-2 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-loss" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">
              {warningCount} warning{warningCount > 1 ? "s" : ""}
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="text-2xs font-medium text-text-muted">
              {alerts.length} notice{alerts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Alert list */}
      <div className="p-4 space-y-2.5 bg-surface-0">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} compact={false} />
        ))}
      </div>
    </div>
  );
}
