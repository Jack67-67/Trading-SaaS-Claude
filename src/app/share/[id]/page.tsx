import { notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPercent, pnlColor, cn } from "@/lib/utils";
import { generateVerdict } from "@/lib/ai-strategy";
import type { BacktestMetrics, EquityCurvePoint } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: "Backtest Result",
    description: "View this backtest result on Quanterra.",
  };
}

interface PageProps {
  params: { id: string };
}

// ── Mini equity chart (inline SVG, same logic as results page) ─────────────────
function MiniEquityChart({ data }: { data: EquityCurvePoint[] }) {
  const W = 800, H = 140, PY = 10;
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
  const breakEvenY = py(equities[0]);
  const xN = px(data.length - 1);
  const yN = py(equities[data.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 140 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="share-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Break-even dashed line */}
      <line
        x1={0} y1={breakEvenY.toFixed(1)} x2={W} y2={breakEvenY.toFixed(1)}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="5 4"
      />
      <polygon points={areaPts} fill="url(#share-grad)" />
      <polyline
        points={linePts}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle cx={xN.toFixed(1)} cy={yN.toFixed(1)} r="4" fill={stroke} />
      <circle cx={xN.toFixed(1)} cy={yN.toFixed(1)} r="8" fill={stroke} fillOpacity="0.2" />
    </svg>
  );
}

export default async function SharePage({ params }: PageProps) {
  const supabase = createServiceClient();

  // Fetch without user_id constraint — service role bypasses RLS
  const { data: run, error } = await supabase
    .from("backtest_runs")
    .select("*, strategies(name)")
    .eq("id", params.id)
    .eq("status", "completed")
    .single();

  if (error || !run) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={20} className="text-text-muted" />
          </div>
          <h1 className="text-lg font-bold text-text-primary mb-2">Result not available</h1>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            This result may be private or the link may have expired.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            <Sparkles size={14} />
            Test your own strategy
          </Link>
        </div>
      </div>
    );
  }

  const config = run.config as Record<string, unknown>;
  const strategyRef = run.strategies as Record<string, unknown> | null;
  const strategyName = (strategyRef?.name as string) || (config?.name as string) || "Strategy";
  const symbol = (config?.symbol as string) || "—";
  const interval = (config?.interval as string) || "—";

  const resultsData = run.results as Record<string, unknown> | null;
  const metrics = resultsData?.metrics as BacktestMetrics | null;
  const equityCurve = (resultsData?.equity_curve as EquityCurvePoint[]) ?? [];

  if (!metrics) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-sm text-text-muted">No metrics available for this result.</p>
        </div>
      </div>
    );
  }

  const verdict = generateVerdict(metrics);
  const isUp = metrics.total_return_pct >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const periodStart = equityCurve[0]?.timestamp ?? (config.start as string | null) ?? null;
  const periodEnd = equityCurve[equityCurve.length - 1]?.timestamp ?? (config.end as string | null) ?? null;
  const periodLabel = periodStart && periodEnd
    ? `${periodStart.slice(0, 4)}–${periodEnd.slice(0, 4)}`
    : null;

  const verdictColor = {
    profit: { border: "border-profit/20", bg: "from-profit/[0.06]", badge: "bg-profit/10 text-profit border-profit/20", label: "text-profit" },
    accent: { border: "border-accent/20", bg: "from-accent/[0.06]", badge: "bg-accent/10 text-accent border-accent/20", label: "text-accent" },
    amber: { border: "border-amber-400/20", bg: "from-amber-400/[0.05]", badge: "bg-amber-400/10 text-amber-400 border-amber-400/20", label: "text-amber-400" },
    loss: { border: "border-loss/20", bg: "from-loss/[0.05]", badge: "bg-loss/10 text-loss border-loss/20", label: "text-loss" },
  }[verdict.color];

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-start py-10 px-4">

      {/* ── Brand strip ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-8">
        <Sparkles size={15} className="text-accent" />
        <span className="text-sm font-bold text-text-primary tracking-tight">Quanterra</span>
        <span className="text-text-muted/30 text-sm">·</span>
        <span className="text-xs text-text-muted">Backtest Result</span>
      </div>

      {/* ── Main card ─────────────────────────────────────────── */}
      <div className={cn(
        "w-full max-w-lg rounded-2xl border overflow-hidden bg-gradient-to-br via-surface-1 to-surface-1",
        verdictColor.border, verdictColor.bg
      )}>

        {/* Header: symbol + verdict */}
        <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-border/60">
          <div>
            <p className="text-2xs text-text-muted uppercase tracking-widest font-semibold mb-1">
              {strategyName}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-bold font-mono text-text-primary">{symbol}</span>
              <span className="text-sm font-mono text-text-muted bg-surface-3 px-2 py-0.5 rounded">{interval}</span>
              {periodLabel && (
                <span className="text-xs text-text-muted">{periodLabel}</span>
              )}
            </div>
          </div>
          <span className={cn(
            "text-xs font-semibold border rounded-full px-3 py-1 shrink-0 mt-0.5",
            verdictColor.badge
          )}>
            {verdict.tagline}
          </span>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/60 bg-surface-0/50">
          <div className="px-5 py-4 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1.5">Return</p>
            <p className={cn("text-2xl font-bold font-mono tabular-nums flex items-center justify-center gap-1", pnlColor(metrics.total_return_pct))}>
              <TrendIcon size={16} className="shrink-0" />
              {formatPercent(metrics.total_return_pct, 1)}
            </p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1.5">Sharpe</p>
            <p className={cn("text-2xl font-bold font-mono tabular-nums", pnlColor(metrics.sharpe_ratio - 1))}>
              {metrics.sharpe_ratio.toFixed(2)}
            </p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1.5">Win Rate</p>
            <p className={cn("text-2xl font-bold font-mono tabular-nums", pnlColor(metrics.win_rate_pct - 50))}>
              {metrics.win_rate_pct.toFixed(1)}%
            </p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1.5">Max DD</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-loss">
              {formatPercent(-Math.abs(metrics.max_drawdown_pct), 1)}
            </p>
          </div>
        </div>

        {/* Equity curve */}
        {equityCurve.length >= 2 && (
          <div className="border-t border-border/60 bg-surface-0/30">
            <MiniEquityChart data={equityCurve} />
          </div>
        )}

        {/* Verdict TL;DR */}
        <div className="px-6 py-4 border-t border-border/60 bg-surface-1/60">
          <p className={cn("text-xs font-semibold mb-1", verdictColor.label)}>
            {verdict.label}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {verdict.tldr}
          </p>
        </div>

        {/* Trade count + period footer */}
        <div className="px-6 py-3 border-t border-border/40 bg-surface-0/50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-2xs text-text-muted font-mono">
            <span>{metrics.total_trades} trades executed</span>
            {periodLabel && (
              <>
                <span className="w-1 h-1 rounded-full bg-border-hover" />
                <span>{periodLabel}</span>
              </>
            )}
          </div>
          <span className="text-2xs text-text-muted/50">Real market data · Polygon</span>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <div className="mt-8 text-center space-y-3">
        <p className="text-sm text-text-muted">Test your own trading idea in seconds.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
        >
          <Sparkles size={14} />
          Try Quanterra free
          <ExternalLink size={12} className="opacity-70" />
        </Link>
        <p className="text-2xs text-text-muted/40">
          No code. No finance degree. Just describe your idea.
        </p>
      </div>

      {/* ── Disclaimer ────────────────────────────────────────── */}
      <p className="mt-10 text-center text-2xs text-text-muted/30 max-w-sm leading-relaxed">
        Past performance does not guarantee future results. Backtest results are simulated and do not represent real trading.
      </p>

    </div>
  );
}
