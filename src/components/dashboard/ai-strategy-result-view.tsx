"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Info, Play, BarChart3, Activity,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBacktestRealtime } from "@/hooks/use-backtest-realtime";
import { formatPercent, formatDateTime, pnlColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { generateInsights, computeConfidence, generateSummary, generateRecommendations } from "@/lib/ai-strategy";
import type { BacktestRun, BacktestMetrics, EquityCurvePoint } from "@/types";
import type { RiskLevel, TimeframeHorizon, AiInsight } from "@/lib/ai-strategy";

interface Props {
  initialRun: BacktestRun;
  strategyName: string;
  strategyCode: string;
}

export function AiStrategyResultView({ initialRun, strategyName, strategyCode }: Props) {
  const { run, isLive, error, refresh } = useBacktestRealtime({ initialRun });
  const [showCode, setShowCode] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (run.status !== "running" && run.status !== "pending") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [run.status]);

  const config = run.config as unknown as Record<string, unknown>;
  const symbol = (config.symbol as string) || "—";
  const risk = (config.ai_risk as RiskLevel) || "balanced";
  const timeframe = (config.ai_timeframe as TimeframeHorizon) || "medium";
  const goal = config.ai_goal as string | null;

  const resultsData = run.results as Record<string, unknown> | null;
  const metrics: BacktestMetrics | null =
    run.status === "completed" && resultsData
      ? ((resultsData.metrics as BacktestMetrics) ?? null)
      : null;
  const equityCurve: EquityCurvePoint[] =
    (resultsData?.equity_curve as EquityCurvePoint[]) ?? [];

  const insights: AiInsight[] = metrics
    ? generateInsights(metrics, risk, timeframe)
    : [];
  const confidence = metrics ? computeConfidence(metrics) : null;
  const summary = metrics ? generateSummary(metrics, { risk, timeframe, symbol }) : null;
  const recommendations = metrics ? generateRecommendations(metrics, risk, timeframe) : [];

  const startedAt = run.started_at ? new Date(run.started_at) : null;
  const completedAt = run.completed_at ? new Date(run.completed_at) : null;
  const elapsed = completedAt && startedAt
    ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
    : startedAt
      ? Math.round((Date.now() - startedAt.getTime()) / 1000)
      : null;

  const riskLabel = { conservative: "Conservative", balanced: "Balanced", aggressive: "Aggressive" }[risk];
  const timeframeLabel = { short: "Short-term", medium: "Medium-term", long: "Long-term" }[timeframe];

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/ai-strategy"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
              <Sparkles size={18} className="text-accent shrink-0" />
              {strategyName}
            </h1>
            <p className="text-2xs text-text-muted mt-0.5 font-mono">
              {symbol} · {riskLabel} · {timeframeLabel}
              {goal && ` · "${goal}"`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-2xs text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />Refresh
          </Button>
          {run.status === "completed" && (
            <Link href={`/dashboard/results/${run.id}`}>
              <Button variant="secondary" size="sm">
                <BarChart3 size={14} />Full Results
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Realtime error */}
      {error && (
        <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-sm text-loss flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────── */}
      {(run.status === "pending" || run.status === "running") && (
        <Card className="relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-3">
            <div className={cn(
              "h-full transition-all duration-1000",
              run.status === "pending"
                ? "w-[20%] bg-yellow-400"
                : "w-2/3 bg-accent animate-pulse"
            )} />
          </div>
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              {run.status === "pending" ? (
                <Sparkles size={24} className="text-accent animate-pulse" />
              ) : (
                <Activity size={24} className="text-accent animate-pulse" />
              )}
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-1">
              {run.status === "pending" ? "Generating your strategy…" : "Running backtest…"}
            </h2>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">
              {run.status === "pending"
                ? "Building a strategy matched to your risk profile and horizon."
                : "Simulating trades against historical market data."}
            </p>
            {elapsed !== null && (
              <p className="text-xs text-text-muted font-mono mt-3 tabular-nums">{elapsed}s</p>
            )}
          </div>
        </Card>
      )}

      {/* ── Failed state ──────────────────────────────────────── */}
      {run.status === "failed" && (
        <Card className="border-loss/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-loss/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-loss" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-loss mb-1">Backtest Failed</h3>
              <p className="text-sm text-text-secondary">{run.error_message || "An unknown error occurred."}</p>
              <Link
                href="/dashboard/ai-strategy"
                className="inline-flex items-center gap-1 mt-3 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                <Play size={13} />Try Again
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ── Results ───────────────────────────────────────────── */}
      {run.status === "completed" && metrics && (
        <>
          {/* KPI hero — unified card */}
          {(() => {
            const isUp = metrics.total_return_pct >= 0;
            const sharpe = metrics.sharpe_ratio;
            const sharpeQ = sharpe >= 2 ? { text: "Excellent", cls: "text-profit" }
              : sharpe >= 1.5 ? { text: "Very Good", cls: "text-profit" }
              : sharpe >= 1 ? { text: "Good", cls: "text-accent" }
              : sharpe >= 0.5 ? { text: "Fair", cls: "text-yellow-400" }
              : { text: "Poor", cls: "text-loss" };
            const confStyles = confidence ? {
              good:    { badge: "bg-profit/10 text-profit border-profit/20",         icon: <CheckCircle2 size={12} className="shrink-0" /> },
              neutral: { badge: "bg-accent/10 text-accent border-accent/20",         icon: <Info size={12} className="shrink-0" /> },
              risky:   { badge: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20", icon: <AlertTriangle size={12} className="shrink-0" /> },
            }[confidence.level] : null;
            return (
              <div className={cn(
                "rounded-2xl border overflow-hidden",
                isUp ? "border-profit/20 shadow-[0_0_60px_-20px_rgba(34,197,94,0.18)]"
                     : "border-loss/20 shadow-[0_0_60px_-20px_rgba(239,68,68,0.18)]"
              )}>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
                  <div className={cn(
                    "px-6 py-5 relative overflow-hidden",
                    isUp ? "bg-gradient-to-br from-profit/[0.06] via-surface-1 to-surface-1"
                         : "bg-gradient-to-br from-loss/[0.06] via-surface-1 to-surface-1"
                  )}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest">Total Return</p>
                      {confidence && confStyles && (
                        <div className={cn("flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full border shrink-0", confStyles.badge)}>
                          {confStyles.icon}
                          {confidence.label}
                        </div>
                      )}
                    </div>
                    <p className={cn("text-4xl font-bold font-mono tabular-nums tracking-tight leading-none", pnlColor(metrics.total_return_pct))}>
                      {formatPercent(metrics.total_return_pct)}
                    </p>
                    <p className="text-xs text-text-muted font-mono mt-2.5">
                      {formatPercent(metrics.annualized_return_pct)} annualized
                    </p>
                  </div>
                  <div className="px-6 py-5 bg-surface-1">
                    <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-3">Sharpe Ratio</p>
                    <p className={cn("text-3xl font-bold font-mono tabular-nums tracking-tight leading-none", pnlColor(sharpe - 1))}>
                      {sharpe.toFixed(2)}
                    </p>
                    <p className={cn("text-xs mt-2.5 font-semibold flex items-center gap-1.5", sharpeQ.cls)}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{sharpeQ.text}
                    </p>
                  </div>
                  <div className="px-6 py-5 bg-surface-1">
                    <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-3">Win Rate</p>
                    <p className={cn("text-3xl font-bold font-mono tabular-nums tracking-tight leading-none", pnlColor(metrics.win_rate_pct - 50))}>
                      {metrics.win_rate_pct.toFixed(1)}%
                    </p>
                    <div className="mt-3 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", metrics.win_rate_pct >= 50 ? "bg-profit" : "bg-loss")}
                        style={{ width: `${metrics.win_rate_pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Equity chart */}
          {equityCurve.length >= 2 && (
            <div className="rounded-2xl border border-border overflow-hidden bg-surface-1">
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Equity Curve</h3>
                  <p className="text-xs text-text-muted mt-0.5">{equityCurve.length} periods</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-text-muted">
                    ${equityCurve[0].equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-text-muted">→</span>
                  <span className={cn("font-semibold", pnlColor(equityCurve[equityCurve.length - 1].equity - equityCurve[0].equity))}>
                    ${equityCurve[equityCurve.length - 1].equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <MiniEquityChart data={equityCurve} />
            </div>
          )}

          {/* Secondary metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Max Drawdown", value: formatPercent(-Math.abs(metrics.max_drawdown_pct)), numeric: -1 },
              { label: "Annualized", value: formatPercent(metrics.annualized_return_pct), numeric: metrics.annualized_return_pct },
              { label: "Total Trades", value: String(metrics.total_trades), numeric: undefined },
              { label: "Profit Factor", value: metrics.profit_factor.toFixed(2), numeric: metrics.profit_factor - 1 },
            ].map(({ label, value, numeric }) => (
              <div key={label} className="rounded-xl bg-surface-1 border border-border px-4 py-3.5">
                <p className="text-2xs text-text-muted uppercase tracking-wider mb-1.5">{label}</p>
                <p className={cn("text-base font-mono font-bold tabular-nums", numeric !== undefined ? pnlColor(numeric) : "text-text-primary")}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* AI Summary + Recommendations */}
          {summary && (
            <div className="rounded-2xl border border-accent/20 bg-accent/[0.03] px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                <p className="text-sm font-semibold text-text-primary">AI Summary</p>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>
              {recommendations.length > 0 && (
                <>
                  <div className="border-t border-border/60" />
                  <div className="space-y-2">
                    <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Recommendations</p>
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-accent text-xs mt-0.5 shrink-0">›</span>
                        <p className="text-sm text-text-secondary leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Insights */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">AI Insights</h2>
            </div>
            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>

          {/* Generated strategy */}
          <Card>
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle>Generated Strategy</CardTitle>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="font-mono">{strategyName}</span>
                {showCode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {showCode && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <pre className="text-xs font-mono text-text-secondary bg-surface-0 rounded-lg p-4 border border-border overflow-x-auto whitespace-pre leading-relaxed">
                  {strategyCode}
                </pre>
                <div className="flex gap-2">
                  <Link href={`/dashboard/strategies`}>
                    <Button variant="secondary" size="sm">View in Strategies</Button>
                  </Link>
                  <span className="text-xs text-text-muted self-center">
                    This strategy was saved to your library automatically.
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Footer actions */}
          <div className="flex items-center gap-3 pt-1">
            <Link href="/dashboard/ai-strategy">
              <Button variant="secondary">
                <Sparkles size={14} />Generate Another
              </Button>
            </Link>
            <Link href={`/dashboard/results/${run.id}`}>
              <Button variant="ghost">
                <BarChart3 size={14} />Full Results →
              </Button>
            </Link>
          </div>

          {/* Metadata */}
          <p className="text-2xs text-text-muted">
            Strategy created {formatDateTime(run.created_at)}
            {elapsed !== null && ` · Completed in ${elapsed}s`}
          </p>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: AiInsight }) {
  const styles = {
    positive: {
      card: "border-profit/20 bg-profit/4",
      icon: <CheckCircle2 size={16} className="text-profit shrink-0 mt-0.5" />,
      title: "text-profit",
    },
    neutral: {
      card: "border-border bg-surface-1",
      icon: <Info size={16} className="text-accent shrink-0 mt-0.5" />,
      title: "text-text-primary",
    },
    warning: {
      card: "border-yellow-400/20 bg-yellow-400/4",
      icon: <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />,
      title: "text-yellow-400",
    },
  }[insight.type];

  return (
    <div className={cn("rounded-xl border px-4 py-3.5 flex gap-3", styles.card)}>
      {styles.icon}
      <div>
        <p className={cn("text-sm font-semibold mb-1", styles.title)}>{insight.title}</p>
        <p className="text-sm text-text-secondary leading-relaxed">{insight.text}</p>
      </div>
    </div>
  );
}

function MiniEquityChart({ data }: { data: EquityCurvePoint[] }) {
  const W = 1000, H = 160, PY = 10;
  const equities = data.map((d) => d.equity);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const range = max - min || 1;

  const px = (i: number) => (i / (data.length - 1)) * W;
  const py = (v: number) => H - PY - ((v - min) / range) * (H - PY * 2);

  const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(d.equity).toFixed(1)}`);
  const linePts = pts.join(" ");
  const areaPts = `0,${H} ${linePts} ${W},${H}`;

  const isUp = equities[equities.length - 1] >= equities[0];
  const stroke = isUp ? "#22c55e" : "#ef4444";

  const gridYs = [0.33, 0.66].map((t) => py(min + t * range));
  const breakEvenY = py(equities[0]);
  const xN = px(data.length - 1), yN = py(equities[data.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ai-equity-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="80%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridYs.map((y, i) => (
        <line key={i} x1={0} y1={y.toFixed(1)} x2={W} y2={y.toFixed(1)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      <line x1={0} y1={breakEvenY.toFixed(1)} x2={W} y2={breakEvenY.toFixed(1)}
        stroke="rgba(255,255,255,0.09)" strokeWidth="1" strokeDasharray="6 5" />
      <polygon points={areaPts} fill="url(#ai-equity-gradient)" />
      <polyline points={linePts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xN.toFixed(1)} cy={yN.toFixed(1)} r="6" fill={stroke} fillOpacity="0.18" />
      <circle cx={xN.toFixed(1)} cy={yN.toFixed(1)} r="3.5" fill={stroke} />
    </svg>
  );
}
