import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, Sparkles, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent, pnlColor } from "@/lib/utils";
import { computeConfidence, generateRiskLabel } from "@/lib/ai-strategy";
import { TrendBadge } from "@/components/dashboard/run-comparison";
import type { BacktestMetrics } from "@/types";
import type { TrendLabel } from "@/lib/trends";

interface RunSummary {
  id: string;
  name: string;
  symbol: string;
  returnPct: number;
  sharpe: number;
  drawdown: number;
  trades: number;
  metrics: BacktestMetrics;
}

interface AiPortfolioOverviewProps {
  runs: RunSummary[];
  lastRunAt?: string | null;
  trends?: Record<string, TrendLabel>; // strategyId → trend
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS = {
  good: {
    label: "Stable",
    icon: ShieldCheck,
    badge: "bg-profit/10 text-profit border-profit/20",
    dot: "bg-profit",
    border: "border-profit/15",
    bg: "bg-profit/[0.025]",
    observation: (n: number) =>
      n === 1
        ? "Your strategy is performing within healthy parameters. Risk is controlled and returns look solid."
        : `Your ${n} strategies are performing within healthy parameters. Risk is controlled across the board.`,
  },
  neutral: {
    label: "Mixed Signals",
    icon: AlertTriangle,
    badge: "bg-accent/10 text-accent border-accent/20",
    dot: "bg-accent",
    border: "border-accent/15",
    bg: "bg-accent/[0.025]",
    observation: (n: number) =>
      n === 1
        ? "Your strategy has some strong points, but a few areas need attention before going live."
        : `Your ${n} strategies show mixed results. Some are performing well, but a few need attention.`,
  },
  risky: {
    label: "Needs Attention",
    icon: AlertTriangle,
    badge: "bg-loss/10 text-loss border-loss/20",
    dot: "bg-loss",
    border: "border-loss/15",
    bg: "bg-loss/[0.025]",
    observation: (n: number) =>
      n === 1
        ? "Your strategy is showing signs of stress. Review the risk settings before considering live trading."
        : `Several of your ${n} strategies are showing signs of stress. Review risk settings before going live.`,
  },
} as const;

export function AiPortfolioOverview({ runs, lastRunAt, trends = {} }: AiPortfolioOverviewProps) {
  if (runs.length === 0) return null;

  const sorted = [...runs].sort((a, b) => b.returnPct - a.returnPct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const bestRisk = generateRiskLabel(best.metrics);
  const worstRisk = runs.length > 1 ? generateRiskLabel(worst.metrics) : null;

  const riskPillCls = {
    low:    "text-profit bg-profit/10 border-profit/20",
    medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    high:   "text-loss bg-loss/10 border-loss/20",
  };

  const avgScore = runs.reduce((s, r) => s + computeConfidence(r.metrics).score, 0) / runs.length;
  const level = avgScore >= 65 ? "good" : avgScore >= 40 ? "neutral" : "risky";
  const status = STATUS[level];
  const StatusIcon = status.icon;

  // Trend direction synthesis
  const trendValues = Object.values(trends);
  const improvingCount  = trendValues.filter((t) => t === "improving").length;
  const decliningCount  = trendValues.filter((t) => t === "declining" || t === "at-risk").length;
  let trendDirectionLine: string | null = null;
  if (trendValues.length > 0) {
    if (improvingCount > 0 && decliningCount === 0) {
      trendDirectionLine = improvingCount === 1 ? "Your strategy is trending upward." : `${improvingCount} strategies are trending upward.`;
    } else if (decliningCount > 0 && improvingCount === 0) {
      trendDirectionLine = decliningCount === 1 ? "One strategy needs attention — performance has declined." : `${decliningCount} strategies need attention.`;
    } else if (improvingCount > 0 && decliningCount > 0) {
      trendDirectionLine = `Mixed direction — ${improvingCount} improving, ${decliningCount} need review.`;
    }
  }

  // Human-readable risk flags
  const flags: string[] = [];
  const highRisk = runs.filter((r) => r.drawdown > 30).length;
  const lowReturn = runs.filter((r) => r.sharpe < 0.5).length;
  const thinSample = runs.filter((r) => r.trades < 15).length;

  if (highRisk > 0)
    flags.push(`${highRisk} ${highRisk === 1 ? "strategy is" : "strategies are"} taking on high risk`);
  if (lowReturn > 0)
    flags.push(`${lowReturn} ${lowReturn === 1 ? "strategy isn't" : "strategies aren't"} generating enough return for the risk taken`);
  if (thinSample > 0)
    flags.push(`${thinSample} ${thinSample === 1 ? "run doesn't" : "runs don't"} have enough trades to be reliable`);

  return (
    <div className={cn("rounded-2xl border overflow-hidden", status.border, status.bg)}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-profit" />
            <span className={cn("relative inline-flex rounded-full h-2 w-2", status.dot)} />
          </div>
          <p className="text-sm font-semibold text-text-primary">Portfolio Health</p>
          <span className="text-text-muted/30">·</span>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Sparkles size={11} className="text-accent/60" />
            {trendValues.length > 0
              ? `Tracking trends across ${runs.length} ${runs.length === 1 ? "strategy" : "strategies"}`
              : `AI is monitoring your ${runs.length} ${runs.length === 1 ? "strategy" : "strategies"}`
            }
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastRunAt && (
            <span className="hidden sm:flex items-center gap-1 text-2xs text-text-muted">
              <Clock size={10} />
              {timeAgo(lastRunAt)}
            </span>
          )}
          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold border rounded-full px-2.5 py-1",
            status.badge
          )}>
            <StatusIcon size={11} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Observation + optional trend direction */}
        <div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {status.observation(runs.length)}
          </p>
          {trendDirectionLine && (
            <p className="text-sm text-text-primary font-medium mt-1">
              {trendDirectionLine}
            </p>
          )}
        </div>

        {/* Performers + flags */}
        <div className="flex flex-wrap gap-2.5">
          {/* Best */}
          <Link
            href={`/dashboard/results/${best.id}`}
            className="group flex items-center gap-2 rounded-lg bg-surface-0/80 border border-border px-3 py-2 hover:border-profit/30 transition-colors min-w-0"
          >
            <TrendingUp size={13} className="text-profit shrink-0" />
            <div className="min-w-0">
              <p className="text-2xs text-text-muted leading-none mb-0.5">Best performer</p>
              <p className="text-xs font-semibold text-text-primary truncate max-w-[110px]">{best.name}</p>
            </div>
            <span className={cn("text-sm font-mono font-bold tabular-nums ml-1 shrink-0", pnlColor(best.returnPct))}>
              {formatPercent(best.returnPct)}
            </span>
            {trends[best.id] && <TrendBadge trend={trends[best.id]} size="sm" />}
            <span className={cn("text-2xs font-semibold px-1.5 py-0.5 rounded-full border shrink-0", riskPillCls[bestRisk.level])}>
              {bestRisk.label}
            </span>
            <ArrowRight size={11} className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
          </Link>

          {/* Worst */}
          {runs.length > 1 && (
            <Link
              href={`/dashboard/results/${worst.id}`}
              className="group flex items-center gap-2 rounded-lg bg-surface-0/80 border border-border px-3 py-2 hover:border-loss/30 transition-colors min-w-0"
            >
              <TrendingDown size={13} className="text-loss shrink-0" />
              <div className="min-w-0">
                <p className="text-2xs text-text-muted leading-none mb-0.5">Weakest performer</p>
                <p className="text-xs font-semibold text-text-primary truncate max-w-[110px]">{worst.name}</p>
              </div>
              <span className={cn("text-sm font-mono font-bold tabular-nums ml-1 shrink-0", pnlColor(worst.returnPct))}>
                {formatPercent(worst.returnPct)}
              </span>
              {trends[worst.id] && <TrendBadge trend={trends[worst.id]} size="sm" />}
              {worstRisk && (
                <span className={cn("text-2xs font-semibold px-1.5 py-0.5 rounded-full border shrink-0", riskPillCls[worstRisk.level])}>
                  {worstRisk.label}
                </span>
              )}
              <ArrowRight size={11} className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
            </Link>
          )}

          {/* Risk flags */}
          {flags.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-400/[0.05] border border-amber-400/20 px-3 py-2 max-w-xs">
              <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {flags.map((f, i) => (
                  <p key={i} className="text-xs text-amber-400/90 leading-snug">{f}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-profit/[0.05] border border-profit/20 px-3 py-2">
              <ShieldCheck size={12} className="text-profit shrink-0" />
              <p className="text-xs text-profit/90">No risk flags detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
