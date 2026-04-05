import Link from "next/link";
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityEvent {
  id: string;
  type: "analysis" | "improvement" | "decline" | "warning" | "insight";
  title: string;
  subtitle?: string;
  timestamp: string;
  runId?: string;
}

const EVENT_META: Record<ActivityEvent["type"], {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  dot: string;
}> = {
  analysis:    { icon: FlaskConical,  iconBg: "bg-accent/10",         iconColor: "text-accent",     dot: "bg-accent" },
  improvement: { icon: TrendingUp,    iconBg: "bg-profit/10",         iconColor: "text-profit",     dot: "bg-profit" },
  decline:     { icon: TrendingDown,  iconBg: "bg-loss/10",           iconColor: "text-loss",       dot: "bg-loss" },
  warning:     { icon: AlertTriangle, iconBg: "bg-amber-400/10",      iconColor: "text-amber-400",  dot: "bg-amber-400" },
  insight:     { icon: Sparkles,      iconBg: "bg-accent/10",         iconColor: "text-accent",     dot: "bg-accent" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

interface AiActivityFeedProps {
  events: ActivityEvent[];
}

export function AiActivityFeed({ events }: AiActivityFeedProps) {
  if (events.length === 0) return null;

  const newCount = events.filter((e) => isNew(e.timestamp)).length;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-surface-1 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-snug">AI Activity Log</p>
            <p className="text-xs text-text-muted">Insights and events from your backtests</p>
          </div>
        </div>

        {newCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-profit bg-profit/10 border border-profit/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
            {newCount} new
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-surface-0 px-5 py-3 space-y-0">
        {events.map((event, i) => {
          const meta = EVENT_META[event.type];
          const Icon = meta.icon;
          const fresh = isNew(event.timestamp);
          const isLast = i === events.length - 1;

          const inner = (
            <div className={cn(
              "flex items-start gap-3 py-3 group",
              !isLast && "border-b border-border/50"
            )}>
              {/* Timeline connector */}
              <div className="flex flex-col items-center shrink-0 pt-0.5">
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center",
                  meta.iconBg
                )}>
                  <Icon size={12} className={meta.iconColor} />
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-border mt-1.5 min-h-[12px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-0.5">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-sm font-medium leading-snug",
                    event.runId
                      ? "text-text-primary group-hover:text-accent transition-colors"
                      : "text-text-primary"
                  )}>
                    {event.title}
                  </p>
                  {fresh && (
                    <span className="text-2xs font-bold text-profit bg-profit/10 rounded px-1 py-0.5 shrink-0 leading-none">
                      NEW
                    </span>
                  )}
                </div>
                {event.subtitle && (
                  <p className="text-xs text-text-muted mt-0.5 truncate">{event.subtitle}</p>
                )}
                <p className="text-2xs text-text-muted/60 mt-1">{timeAgo(event.timestamp)}</p>
              </div>
            </div>
          );

          return event.runId ? (
            <Link key={event.id} href={`/dashboard/results/${event.runId}`} className="block">
              {inner}
            </Link>
          ) : (
            <div key={event.id}>{inner}</div>
          );
        })}
      </div>

    </div>
  );
}
