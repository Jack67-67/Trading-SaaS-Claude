import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppAlert } from "@/lib/alerts";

const SEV_ICON = {
  critical: { Icon: AlertCircle,   cls: "text-loss"         },
  warning:  { Icon: AlertTriangle, cls: "text-amber-400"    },
  info:     { Icon: Info,          cls: "text-accent"       },
  good:     { Icon: CheckCircle2,  cls: "text-profit"       },
} as const;

// Plain-English one-liner derived from the alert title
function plainMessage(title: string, strategyName: string, symbol: string): string {
  const t = title.toLowerCase();
  const label = strategyName && strategyName !== symbol ? strategyName : symbol;

  if (t.includes("critical") || t.includes("broken"))
    return `${label} — strategy may be broken, check now`;
  if (t.includes("extreme drawdown") || t.includes("stop —"))
    return `${label} — extreme drawdown risk, do not run live`;
  if (t.includes("drawdown too high"))
    return `${label} — drawdown too high, add a stop-loss`;
  if (t.includes("collapsed") || t.includes("critical: "))
    return `${label} — performance collapsed vs last run`;
  if (t.includes("declining") || t.includes("decline"))
    return `${label} — performance dropped since last run`;
  if (t.includes("poor risk") || t.includes("not worth trading"))
    return `${label} — poor risk/reward, not ready to trade`;
  if (t.includes("insufficient data") || t.includes("unreliable"))
    return `${label} — too few trades to trust the results`;
  if (t.includes("return up") || t.includes("confirm before"))
    return `${label} — performance improved, verify before scaling`;
  if (t.includes("improving") || t.includes("validate before"))
    return `${label} — risk-adjusted quality improved`;
  return `${label} — ${title.toLowerCase()}`;
}

interface AlertsBarProps {
  alerts: AppAlert[];
  /** Max number of alerts to show. Default 4. */
  limit?: number;
}

export function AlertsBar({ alerts, limit = 4 }: AlertsBarProps) {
  if (alerts.length === 0) return null;

  const shown = alerts.slice(0, limit);
  const overflow = alerts.length - shown.length;

  const hasUrgent = alerts.some(
    (a) => a.severity === "critical" || a.severity === "warning"
  );

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      hasUrgent ? "border-amber-500/25" : "border-border"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 border-b",
        hasUrgent
          ? "bg-amber-500/[0.05] border-amber-500/20"
          : "bg-surface-1 border-border"
      )}>
        <p className="text-xs font-semibold text-text-primary">
          Strategy alerts
        </p>
        <span className="text-2xs text-text-muted">
          {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
        </span>
      </div>

      {/* Alert rows */}
      <div className="divide-y divide-border bg-surface-0">
        {shown.map((alert) => {
          const { Icon, cls } = SEV_ICON[alert.severity];
          const msg = plainMessage(alert.title, alert.strategyName, alert.symbol);
          return (
            <Link
              key={alert.id}
              href={`/dashboard/results/${alert.runId}`}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-1/60 transition-colors"
            >
              <Icon size={13} className={cn("shrink-0", cls)} />
              <p className="flex-1 text-xs text-text-secondary group-hover:text-text-primary transition-colors truncate">
                {msg}
              </p>
              <ArrowRight
                size={11}
                className="shrink-0 text-text-muted group-hover:text-accent transition-colors"
              />
            </Link>
          );
        })}

        {overflow > 0 && (
          <Link
            href="/dashboard/overview"
            className="group flex items-center gap-2 px-4 py-2.5 hover:bg-surface-1/60 transition-colors"
          >
            <p className="text-xs text-text-muted group-hover:text-accent transition-colors">
              +{overflow} more alert{overflow > 1 ? "s" : ""} — view all
            </p>
            <ArrowRight size={11} className="text-text-muted group-hover:text-accent transition-colors" />
          </Link>
        )}
      </div>
    </div>
  );
}
