import Link from "next/link";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent, pnlColor } from "@/lib/utils";
import { computeConfidence } from "@/lib/ai-strategy";
import type { BacktestMetrics } from "@/types";

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
}

export function AiPortfolioOverview({ runs }: AiPortfolioOverviewProps) {
  if (runs.length === 0) return null;

  // Compute portfolio-level signals
  const sorted = [...runs].sort((a, b) => b.returnPct - a.returnPct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const avgSharpe = runs.reduce((s, r) => s + r.sharpe, 0) / runs.length;
  const warnings: string[] = [];

  const highDrawdownCount = runs.filter((r) => r.drawdown > 30).length;
  const lowSharpeCount = runs.filter((r) => r.sharpe < 0.5).length;
  const lowTradeCount = runs.filter((r) => r.trades < 15).length;

  if (highDrawdownCount > 0)
    warnings.push(`${highDrawdownCount} ${highDrawdownCount === 1 ? "strategy" : "strategies"} with drawdown > 30%`);
  if (lowSharpeCount > 0)
    warnings.push(`${lowSharpeCount} ${lowSharpeCount === 1 ? "strategy" : "strategies"} with Sharpe < 0.5`);
  if (lowTradeCount > 0)
    warnings.push(`${lowTradeCount} ${lowTradeCount === 1 ? "run" : "runs"} with fewer than 15 trades`);

  // Portfolio confidence: average confidence scores
  const avgScore =
    runs.reduce((s, r) => s + computeConfidence(r.metrics).score, 0) / runs.length;
  const portfolioLevel = avgScore >= 65 ? "good" : avgScore >= 40 ? "neutral" : "risky";

  const portfolioObservation =
    portfolioLevel === "good"
      ? `Your ${runs.length} completed ${runs.length === 1 ? "backtest shows" : "backtests show"} healthy risk-adjusted returns. Overall portfolio confidence is strong.`
      : portfolioLevel === "neutral"
      ? `Your ${runs.length} completed ${runs.length === 1 ? "backtest has" : "backtests have"} mixed signals. Some strategies look solid, but a few metrics need attention.`
      : `Your ${runs.length} completed ${runs.length === 1 ? "backtest carries" : "backtests carry"} elevated risk. Review drawdown and Sharpe across your strategies before going live.`;

  const levelStyles = {
    good:    { border: "border-profit/20",    bg: "bg-profit/[0.03]",    dot: "bg-profit",    label: "text-profit",    text: "Good" },
    neutral: { border: "border-accent/20",    bg: "bg-accent/[0.03]",    dot: "bg-accent",    label: "text-accent",    text: "Neutral" },
    risky:   { border: "border-yellow-400/20", bg: "bg-yellow-400/[0.03]", dot: "bg-yellow-400", label: "text-yellow-400", text: "Risky" },
  }[portfolioLevel];

  return (
    <div className={cn("rounded-2xl border px-5 py-4", levelStyles.border, levelStyles.bg)}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <p className="text-sm font-semibold text-text-primary">AI Portfolio Overview</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", levelStyles.dot)} />
          <span className={cn("text-xs font-semibold", levelStyles.label)}>{levelStyles.text}</span>
          <span className="text-2xs text-text-muted">· Avg Sharpe {avgSharpe.toFixed(2)}</span>
        </div>
      </div>

      {/* Observation */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{portfolioObservation}</p>

      {/* Best / Worst / Warnings */}
      <div className="flex flex-wrap gap-3">
        {/* Best performer */}
        <Link
          href={`/dashboard/results/${best.id}`}
          className="group flex items-center gap-2 rounded-lg bg-surface-0 border border-border px-3 py-2 hover:border-profit/30 transition-colors min-w-0"
        >
          <TrendingUp size={13} className="text-profit shrink-0" />
          <div className="min-w-0">
            <p className="text-2xs text-text-muted">Best</p>
            <p className="text-xs font-semibold text-text-primary truncate max-w-[120px]">{best.name}</p>
          </div>
          <span className={cn("text-sm font-mono font-bold tabular-nums ml-1 shrink-0", pnlColor(best.returnPct))}>
            {formatPercent(best.returnPct)}
          </span>
          <ArrowRight size={12} className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
        </Link>

        {/* Worst performer — only show if different from best */}
        {runs.length > 1 && (
          <Link
            href={`/dashboard/results/${worst.id}`}
            className="group flex items-center gap-2 rounded-lg bg-surface-0 border border-border px-3 py-2 hover:border-loss/30 transition-colors min-w-0"
          >
            <TrendingDown size={13} className="text-loss shrink-0" />
            <div className="min-w-0">
              <p className="text-2xs text-text-muted">Worst</p>
              <p className="text-xs font-semibold text-text-primary truncate max-w-[120px]">{worst.name}</p>
            </div>
            <span className={cn("text-sm font-mono font-bold tabular-nums ml-1 shrink-0", pnlColor(worst.returnPct))}>
              {formatPercent(worst.returnPct)}
            </span>
            <ArrowRight size={12} className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
          </Link>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-400/[0.06] border border-yellow-400/20 px-3 py-2">
            <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-400/90">{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* All-clear when no warnings */}
        {warnings.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-profit/[0.06] border border-profit/20 px-3 py-2">
            <CheckCircle2 size={13} className="text-profit shrink-0" />
            <p className="text-xs text-profit/90">No risk warnings detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
