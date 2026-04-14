import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, ArrowRight,
  Sparkles, TriangleAlert, CheckCircle2, Clock,
} from "lucide-react";
import { cn, pnlColor, formatPercent } from "@/lib/utils";
import type { TrendLabel } from "@/lib/trends";
import type { AppAlert } from "@/lib/alerts";

// ── Types ───────────────────────────────────────────────────────────────────

export interface StrategyDailyUpdate {
  strategyId: string;
  strategyName: string;
  symbol: string;
  latestRunId: string | null;
  lastAnalyzedAt: string | null;
  returnPct: number;
  returnDelta: number | null; // null = first run, no comparison
  sharpeDelta: number | null;
  trend: TrendLabel | null;
  isFirstRun: boolean;
}

// ── Relative time ───────────────────────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const seconds = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Key insight generation ──────────────────────────────────────────────────

function generateInsight(
  updates: StrategyDailyUpdate[],
  alerts: AppAlert[],
): { text: string; type: "positive" | "warning" | "neutral" } {
  // Critical alerts take priority
  const critAlert = alerts.find((a) => a.severity === "critical");
  if (critAlert) {
    return {
      text: `${critAlert.strategyName}: ${critAlert.message.split(".")[0]}.`,
      type: "warning",
    };
  }

  const withDelta = updates.filter((u) => u.returnDelta !== null);

  // No comparisons yet — first-run insight
  if (withDelta.length === 0) {
    if (updates.length > 0) {
      const best = updates.reduce((a, b) =>
        a.returnPct > b.returnPct ? a : b
      );
      return {
        text:
          best.returnPct > 0
            ? `${best.strategyName} is your best result at ${best.returnPct >= 0 ? "+" : ""}${best.returnPct.toFixed(1)}% return. Run it on a second date range to confirm the edge is real before acting on it.`
            : `Your best result so far is ${best.returnPct.toFixed(1)}%. Run each strategy on a wider date range — more data leads to more reliable conclusions.`,
        type: best.returnPct > 10 ? "positive" : "neutral",
      };
    }
    return {
      text: "Run a backtest to start monitoring strategy performance. Results will appear here automatically.",
      type: "neutral",
    };
  }

  // Warning alerts
  const warnAlert = alerts.find((a) => a.severity === "warning");

  // Big decline?
  const biggestLoss = [...withDelta]
    .filter((u) => (u.returnDelta ?? 0) < 0)
    .sort((a, b) => a.returnDelta! - b.returnDelta!)[0];
  if (biggestLoss && Math.abs(biggestLoss.returnDelta!) > 8) {
    return {
      text: `${biggestLoss.strategyName} returned ${biggestLoss.returnDelta!.toFixed(1)}pp less than last run. That is a meaningful drop, not noise. Run it on the most recent 6 months to check if the edge is holding.`,
      type: "warning",
    };
  }

  if (warnAlert) {
    return {
      text: `${warnAlert.strategyName}: ${warnAlert.message.split(".")[0]}.`,
      type: "warning",
    };
  }

  // Big improvement?
  const biggestGain = [...withDelta]
    .filter((u) => (u.returnDelta ?? 0) > 0)
    .sort((a, b) => b.returnDelta! - a.returnDelta!)[0];
  if (biggestGain && biggestGain.returnDelta! > 8) {
    return {
      text: `${biggestGain.strategyName} improved +${biggestGain.returnDelta!.toFixed(1)}pp since last run. Confirm it on a fresh date range before increasing position size — one good run is not a pattern.`,
      type: "positive",
    };
  }

  // Majority declining?
  const declining = updates.filter(
    (u) => u.trend === "declining" || u.trend === "at-risk"
  );
  if (declining.length > 0 && declining.length >= updates.filter((u) => u.trend !== null).length) {
    return {
      text: `${declining.length > 1 ? `${declining.length} strategies are` : `${declining[0].strategyName} is`} showing weaker performance. Review entry conditions before running again.`,
      type: "warning",
    };
  }

  // All improving?
  const improving = updates.filter((u) => u.trend === "improving");
  const tracked = updates.filter((u) => u.trend !== null);
  if (improving.length > 0 && improving.length === tracked.length) {
    return {
      text: `All tracked strategies are improving. Now focus on validation — run each on a different time period to confirm the edge generalizes beyond the current date range.`,
      type: "positive",
    };
  }

  // Default: stable
  return {
    text: "Performance is stable across all strategies. Consider extending your date ranges for higher statistical confidence before drawing conclusions.",
    type: "neutral",
  };
}

// ── Trend config ────────────────────────────────────────────────────────────

const TREND_CONFIG: Record<TrendLabel, { icon: React.ReactNode; label: string; cls: string }> = {
  improving: { icon: <TrendingUp  size={11} />, label: "Improving", cls: "text-profit" },
  stable:    { icon: <Minus       size={11} />, label: "Stable",    cls: "text-text-muted" },
  "at-risk": { icon: <TriangleAlert size={10} />, label: "At-risk", cls: "text-yellow-400" },
  declining: { icon: <TrendingDown size={11} />, label: "Declining", cls: "text-loss" },
};

// ── Main component ──────────────────────────────────────────────────────────

interface DailyUpdateProps {
  updates: StrategyDailyUpdate[];
  alerts: AppAlert[];
  lastUpdatedAt: string | null;
}

export function DailyUpdate({ updates, alerts, lastUpdatedAt }: DailyUpdateProps) {
  const insight = generateInsight(updates, alerts);

  const insightStyle = {
    positive: {
      wrap: "border-profit/20 bg-profit/[0.03]",
      icon: <CheckCircle2 size={13} className="text-profit shrink-0 mt-0.5" />,
      text: "text-text-secondary",
    },
    warning: {
      wrap: "border-yellow-400/20 bg-yellow-400/[0.02]",
      icon: <TriangleAlert size={13} className="text-yellow-400 shrink-0 mt-0.5" />,
      text: "text-text-secondary",
    },
    neutral: {
      wrap: "border-border bg-surface-2",
      icon: <Sparkles size={13} className="text-accent shrink-0 mt-0.5" />,
      text: "text-text-secondary",
    },
  }[insight.type];

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-surface-1 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <p className="text-sm font-semibold text-text-primary">Today&apos;s Update</p>
        </div>
        {lastUpdatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock size={11} />
            <span>Last analyzed {timeAgo(lastUpdatedAt)}</span>
          </div>
        )}
      </div>

      {/* ── Key insight ────────────────────────────────────────── */}
      <div className={cn("flex items-start gap-2.5 px-5 py-4 border-b border-border", insightStyle.wrap)}>
        {insightStyle.icon}
        <p className={cn("text-sm leading-relaxed", insightStyle.text)}>
          {insight.text}
        </p>
      </div>

      {/* ── Strategy rows ──────────────────────────────────────── */}
      {updates.length > 0 && (
        <div className="divide-y divide-border bg-surface-0">
          {updates.map((update) => {
            const href = update.latestRunId
              ? `/dashboard/results/${update.latestRunId}`
              : `/dashboard/strategies/${update.strategyId}`;
            const trendConf = update.trend ? TREND_CONFIG[update.trend] : null;

            return (
              <Link
                key={update.strategyId}
                href={href}
                className="group flex items-center gap-4 px-5 py-3.5 hover:bg-surface-1 transition-colors"
              >
                {/* Name + last analyzed */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                    {update.strategyName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {update.symbol && (
                      <span className="text-2xs font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                        {update.symbol}
                      </span>
                    )}
                    {update.lastAnalyzedAt && (
                      <span className="text-2xs text-text-muted/60">
                        {update.isFirstRun ? "First run · " : ""}{timeAgo(update.lastAnalyzedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Return */}
                <div className="text-right shrink-0">
                  <span className={cn("text-sm font-bold font-mono tabular-nums", pnlColor(update.returnPct))}>
                    {formatPercent(update.returnPct)}
                  </span>
                </div>

                {/* Delta vs previous run */}
                <div className="w-20 text-right shrink-0 hidden sm:block">
                  {update.returnDelta !== null ? (
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold tabular-nums",
                        update.returnDelta > 0.5  ? "text-profit" :
                        update.returnDelta < -0.5 ? "text-loss" :
                        "text-text-muted"
                      )}
                    >
                      {update.returnDelta > 0 ? "+" : ""}
                      {update.returnDelta.toFixed(1)}pp
                    </span>
                  ) : (
                    <span className="text-2xs text-text-muted/40">First run</span>
                  )}
                </div>

                {/* Trend */}
                <div className="w-24 hidden md:block shrink-0">
                  {trendConf ? (
                    <span className={cn("flex items-center gap-1.5 text-xs font-medium", trendConf.cls)}>
                      {trendConf.icon}
                      {trendConf.label}
                    </span>
                  ) : (
                    <span className="text-2xs text-text-muted/40">—</span>
                  )}
                </div>

                <ArrowRight size={12} className="text-text-muted/30 group-hover:text-accent transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
