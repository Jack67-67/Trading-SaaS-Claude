import { ShieldAlert, ShieldX, Shield, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveGuard, EconomicEvent } from "@/lib/economic-calendar";
import { daysLabel } from "@/lib/economic-calendar";

// ── Category labels ──────────────────────────────────────────────────���───────

const CATEGORY_COLOR: Record<EconomicEvent["category"], string> = {
  fomc:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cpi:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  nfp:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  earnings: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  options:  "bg-surface-3 text-text-muted border-border",
  other:    "bg-surface-3 text-text-muted border-border",
};

// ── Guard level config ───────────────────────────────────────────────────────

const LEVEL_CFG = {
  danger: {
    Icon: ShieldX,
    border: "border-loss/30",
    bg: "bg-loss/[0.04]",
    headerBg: "bg-loss/[0.06] border-loss/20",
    iconBg: "bg-loss/10",
    iconColor: "text-loss",
    titleColor: "text-loss",
    badge: "bg-loss/10 text-loss border-loss/25",
    label: "Major event detected",
    headline: (daysUntil: number) =>
      daysUntil <= 0
        ? "Major market event active — avoid opening new positions"
        : "Major event tomorrow — elevated volatility risk",
    subline: "Unexpected results from strategies run during high-impact events are common. Consider waiting until after the release.",
  },
  caution: {
    Icon: ShieldAlert,
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.03]",
    headerBg: "bg-amber-500/[0.05] border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    titleColor: "text-amber-300",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    label: "Volatility risk elevated",
    headline: (daysUntil: number) =>
      `High-impact event ${daysLabel(daysUntil)} — monitor conditions`,
    subline: "A major scheduled event is approaching. Strategies may behave differently than historical runs suggest.",
  },
  upcoming: {
    Icon: Shield,
    border: "border-border",
    bg: "bg-surface-1",
    headerBg: "bg-surface-1 border-border",
    iconBg: "bg-surface-3",
    iconColor: "text-text-muted",
    titleColor: "text-text-primary",
    badge: "bg-surface-2 text-text-muted border-border",
    label: "Event on the horizon",
    headline: (daysUntil: number) =>
      `Scheduled market event ${daysLabel(daysUntil)} — be aware`,
    subline: "A medium-impact event is scheduled this week. No immediate action needed.",
  },
} as const;

// ── Component ────────────────────────────────────────────────────────────────

interface EventGuardProps {
  guard: ActiveGuard;
  /** compact = single header bar only; full = header + event list */
  variant?: "compact" | "full";
}

export function EventGuard({ guard, variant = "full" }: EventGuardProps) {
  const cfg = LEVEL_CFG[guard.level];
  const { Icon } = cfg;

  // Show only today/tomorrow events in compact; all nearby in full
  const shownEvents = variant === "compact"
    ? guard.events.filter((_, i) => i < 3)
    : guard.events.slice(0, 6);

  return (
    <div className={cn("rounded-2xl border overflow-hidden", cfg.border, cfg.bg)}>

      {/* Header */}
      <div className={cn(
        "flex items-start gap-3 px-5 py-4 border-b",
        cfg.headerBg
      )}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.iconBg)}>
          <Icon size={16} className={cfg.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-semibold leading-snug", cfg.titleColor)}>
              {cfg.headline(guard.daysUntil)}
            </p>
            <span className={cn(
              "inline-flex items-center text-2xs font-semibold border rounded-full px-2 py-0.5 shrink-0",
              cfg.badge
            )}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {cfg.subline}
          </p>
        </div>
      </div>

      {/* Event list */}
      {variant === "full" && shownEvents.length > 0 && (
        <div className="divide-y divide-border/60">
          {shownEvents.map((ev) => {
            const daysMs = new Date(ev.date + "T00:00:00Z").getTime();
            const todayMs = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            const days = Math.round((daysMs - todayMs) / 86_400_000);

            return (
              <div key={ev.id} className="flex items-center gap-3 px-5 py-3">
                <Calendar size={12} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-text-primary">{ev.short}</span>
                    <span className={cn(
                      "text-2xs font-medium border rounded-full px-1.5 py-0.5",
                      CATEGORY_COLOR[ev.category]
                    )}>
                      {ev.category.toUpperCase()}
                    </span>
                    {ev.impact === "high" && (
                      <span className="text-2xs font-semibold text-loss bg-loss/10 border border-loss/20 rounded-full px-1.5 py-0.5">
                        High impact
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-text-muted mt-0.5 truncate">{ev.title}</p>
                </div>
                <span className="text-2xs font-mono text-text-muted shrink-0">
                  {ev.date}
                  {days === 0 && <span className="ml-1 text-loss font-semibold">· Today</span>}
                  {days === 1 && <span className="ml-1 text-amber-400 font-semibold">· Tomorrow</span>}
                  {days > 1 && <span className="ml-1 text-text-muted/60">· {days}d</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer — danger only */}
      {guard.level === "danger" && (
        <div className={cn(
          "flex items-center gap-2 px-5 py-2.5 border-t border-loss/15",
          "bg-loss/[0.04]"
        )}>
          <AlertTriangle size={11} className="text-loss shrink-0" />
          <p className="text-2xs text-loss/80 leading-relaxed">
            This is not a trading block — it is a warning. You can still run backtests and configure strategies. Do not open live positions without a plan for the event volatility.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Compact inline badge (for tight spaces) ──────────────────────────────────

interface EventGuardBadgeProps {
  guard: ActiveGuard;
}

export function EventGuardBadge({ guard }: EventGuardBadgeProps) {
  const cfg = LEVEL_CFG[guard.level];
  const { Icon } = cfg;
  const nearest = guard.events[0];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-2xs font-semibold border rounded-full px-2.5 py-1",
      cfg.badge
    )}>
      <Icon size={10} className={cfg.iconColor} />
      {nearest?.short ?? "Event"} {daysLabel(guard.daysUntil)}
    </span>
  );
}
