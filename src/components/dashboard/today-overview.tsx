import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  ArrowRight, AlertCircle, Info, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent, pnlColor } from "@/lib/utils";
import type { TrendLabel } from "@/lib/trends";
import { TREND_META } from "@/components/dashboard/run-comparison";
import type { AppAlert } from "@/lib/alerts";

// ── Public types ────────────────────────────────────────────────────────────

export interface StrategyOverviewCard {
  strategyId: string;
  strategyName: string;
  symbol: string;
  latestRunId: string;
  latestRunAt: string;
  trend: TrendLabel | null;
  returnPct: number;
  sharpe: number;
  isBest: boolean;
  isWorst: boolean;
  summary: string;
  alerts: AppAlert[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Static config ────────────────────────────────────────────────────────────

const TREND_CFG = {
  improving: {
    label: "Improving",
    Icon: TrendingUp,
    cls: "text-profit bg-profit/10 border-profit/20",
  },
  stable: {
    label: "Stable",
    Icon: Minus,
    cls: "text-accent bg-accent/10 border-accent/20",
  },
  "at-risk": {
    label: "At Risk",
    Icon: AlertTriangle,
    cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
  declining: {
    label: "Declining",
    Icon: TrendingDown,
    cls: "text-loss bg-loss/10 border-loss/20",
  },
} as const;

const ALERT_CFG = {
  critical: { Icon: AlertCircle, cls: "text-loss bg-loss/10 border border-loss/20" },
  warning:  { Icon: AlertTriangle, cls: "text-yellow-400 bg-yellow-400/10 border border-yellow-400/20" },
  info:     { Icon: Info, cls: "text-accent bg-accent/10 border border-accent/20" },
} as const;

// ── Strategy row ─────────────────────────────────────────────────────────────

function StrategyRow({
  card,
  isLast,
}: {
  card: StrategyOverviewCard;
  isLast: boolean;
}) {
  const trend = card.trend ? TREND_CFG[card.trend] : null;
  const TIcon = trend?.Icon ?? Minus;

  const leftEdge = card.trend ? TREND_META[card.trend].leftEdge : null;

  return (
    <Link
      href={`/dashboard/results/${card.latestRunId}`}
      className={cn(
        "group relative flex flex-col gap-3 px-5 py-4 hover:bg-surface-1/60 transition-colors",
        !isLast && "border-b border-border"
      )}
    >
      {/* Left-edge trend accent */}
      {leftEdge && (
        <span className={cn("absolute left-0 inset-y-0 w-0.5 rounded-r-full", leftEdge)} />
      )}
      {/* ── Top row: identity + trend + return ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">

        {/* Left: name + symbol + timestamp */}
        <div className="flex items-start gap-2 min-w-0">

          {/* Best / Worst label */}
          {card.isBest && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-2xs font-bold text-profit bg-profit/10 border border-profit/20 rounded-full px-2 py-0.5 shrink-0">
              <TrendingUp size={9} />
              Best
            </span>
          )}
          {card.isWorst && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-2xs font-bold text-loss bg-loss/10 border border-loss/20 rounded-full px-2 py-0.5 shrink-0">
              <TrendingDown size={9} />
              Weakest
            </span>
          )}

          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
              {card.strategyName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xs font-mono text-text-muted bg-surface-3 rounded px-1.5 py-0.5">
                {card.symbol}
              </span>
              <span className="flex items-center gap-1 text-2xs text-text-muted">
                <Clock size={9} />
                {timeAgo(card.latestRunAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: trend badge + return + arrow */}
        <div className="flex items-center gap-2.5 shrink-0">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-2xs font-semibold border rounded-full px-2.5 py-1",
              trend.cls
            )}>
              <TIcon size={10} />
              {trend.label}
            </span>
          )}
          <span className={cn(
            "text-base font-bold font-mono tabular-nums",
            pnlColor(card.returnPct)
          )}>
            {formatPercent(card.returnPct)}
          </span>
          <ArrowRight size={13} className="text-text-muted group-hover:text-accent transition-colors" />
        </div>
      </div>

      {/* ── AI summary ── */}
      <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
        {card.summary}
      </p>

      {/* ── Alerts (up to 3) ── */}
      {card.alerts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.alerts.slice(0, 3).map((alert) => {
            const { Icon, cls } = ALERT_CFG[alert.severity];
            return (
              <span
                key={alert.id}
                className={cn(
                  "inline-flex items-center gap-1 text-2xs font-medium rounded-full px-2 py-0.5",
                  cls
                )}
              >
                <Icon size={9} />
                {alert.title}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface TodayOverviewProps {
  strategies: StrategyOverviewCard[];
}

export function TodayOverview({ strategies }: TodayOverviewProps) {
  if (strategies.length === 0) return null;

  const improvingCount = strategies.filter((s) => s.trend === "improving").length;
  const atRiskCount    = strategies.filter((s) => s.trend === "at-risk" || s.trend === "declining").length;

  const subtitle =
    improvingCount > 0 && atRiskCount === 0
      ? `${improvingCount} improving`
      : atRiskCount > 0 && improvingCount === 0
        ? `${atRiskCount} need attention`
        : improvingCount > 0 && atRiskCount > 0
          ? `${improvingCount} improving · ${atRiskCount} need attention`
          : `${strategies.length} ${strategies.length === 1 ? "strategy" : "strategies"} stable`;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-1">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Today&apos;s Overview
          </h2>
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        </div>
        <Link
          href="/dashboard/results"
          className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          All results <ArrowRight size={11} />
        </Link>
      </div>

      {/* Strategy rows */}
      <div className="bg-surface-0 divide-y divide-border">
        {strategies.map((card, i) => (
          <StrategyRow
            key={card.strategyId}
            card={card}
            isLast={i === strategies.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
