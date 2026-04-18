import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketEvent } from "@/lib/market-events";

interface MarketContextBannerProps {
  events: MarketEvent[];
}

export function MarketContextBanner({ events }: MarketContextBannerProps) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <AlertTriangle size={13} className="text-yellow-400 shrink-0" />
        <p className="text-xs font-semibold text-text-primary">
          Market context for this period
        </p>
        <span className="ml-auto text-2xs text-text-muted">
          {events.length} notable {events.length === 1 ? "event" : "events"} overlap
        </span>
      </div>

      <div className="divide-y divide-border">
        {events.map((ev) => {
          const isWarning = ev.severity === "warning";
          return (
            <div key={ev.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className={cn(
                "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                isWarning ? "bg-yellow-400/10" : "bg-accent/10"
              )}>
                {isWarning
                  ? <AlertTriangle size={11} className="text-yellow-400" />
                  : <Info size={11} className="text-accent" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary">{ev.title}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{ev.description}</p>
                <p className="text-2xs text-text-muted/60 mt-1 font-mono">
                  {ev.start}{ev.end && ev.end !== ev.start ? ` → ${ev.end}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 bg-surface-0 border-t border-border">
        <p className="text-2xs text-text-muted/70 leading-relaxed">
          Results tested during volatile or unusual market conditions may not reflect normal performance.
          Consider running a second test on a different date range to verify robustness.
        </p>
      </div>
    </div>
  );
}
