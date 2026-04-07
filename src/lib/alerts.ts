export type AlertSeverity = "critical" | "warning" | "info" | "good";

export interface AppAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  strategyId: string;
  strategyName: string;
  runId: string;
  symbol: string;
  completedAt: string;
}

interface RunInput {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  completedAt: string;
  returnPct: number;
  sharpe: number;
  drawdown: number; // absolute positive value
  trades: number;
  winRate: number;
}

export function generateAlerts(runs: RunInput[]): AppAlert[] {
  // Group by strategyId
  const byStrategy = new Map<string, RunInput[]>();
  for (const run of runs) {
    const existing = byStrategy.get(run.strategyId) ?? [];
    existing.push(run);
    byStrategy.set(run.strategyId, existing);
  }

  const alerts: AppAlert[] = [];

  for (const [, stratRuns] of byStrategy) {
    // Sort ascending by date so latest is last
    const sorted = [...stratRuns].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
    const stratAlerts: AppAlert[] = [];

    // ── Critical: extreme drawdown ───────────────────────────────────────────
    if (latest.drawdown > 40) {
      stratAlerts.push({
        id: `${latest.id}-drawdown-critical`,
        severity: "critical",
        title: "Stop — Extreme Drawdown Risk",
        message: `Max drawdown hit ${latest.drawdown.toFixed(1)}% — the strategy has no effective stop-loss. Do not run this live under any circumstances. Add a hard stop at 25% drawdown before running again; at this level a single bad month could wipe out 3–4 months of gains.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Critical: return collapsed vs previous run ────────────────────────────
    if (prev && prev.returnPct - latest.returnPct > 25) {
      stratAlerts.push({
        id: `${latest.id}-return-drop-critical`,
        severity: "critical",
        title: "Critical: Strategy May Be Broken",
        message: `Return collapsed from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% — a ${(prev.returnPct - latest.returnPct).toFixed(1)}pp drop. This is not normal variation. Either the strategy overfitted to the previous period or the market regime changed. Run on a completely fresh date range immediately to find out which.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Warning: elevated drawdown ────────────────────────────────────────────
    if (latest.drawdown > 25 && latest.drawdown <= 40 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-drawdown-warning`,
        severity: "warning",
        title: "Drawdown Too High — Needs a Fix",
        message: `Max drawdown is ${latest.drawdown.toFixed(1)}% — positions are being held through too much loss. Add a hard stop at ${Math.round(latest.drawdown * 0.65).toFixed(0)}% and rerun. That single change will likely cut the drawdown significantly without sacrificing most of the returns.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Warning: weak Sharpe ──────────────────────────────────────────────────
    if (latest.sharpe < 0.3 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-sharpe-warning`,
        severity: "warning",
        title: "Poor Risk/Reward — Not Worth Trading Yet",
        message: `Sharpe of ${latest.sharpe.toFixed(2)} means the strategy is barely compensating for the volatility it takes on. A savings account would give better risk-adjusted returns. Add a trend filter or tighten entry conditions — higher-conviction signals trade less but produce far better Sharpe ratios.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Warning: return declined vs previous ─────────────────────────────────
    if (prev && prev.returnPct - latest.returnPct > 12 && prev.returnPct - latest.returnPct <= 25 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-return-decline`,
        severity: "warning",
        title: "Declining Performance — Investigate Now",
        message: `Return dropped from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% between runs — that is a meaningful slide, not noise. Run the same strategy on the most recent 6 months to determine whether the decline is ongoing or market-specific before running it again.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Info: low trade count ─────────────────────────────────────────────────
    if (latest.trades < 8 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-low-trades`,
        severity: "info",
        title: "Insufficient Data — Results Unreliable",
        message: `Only ${latest.trades} trades executed — every metric here is statistically meaningless. A single lucky trade is inflating the results. Extend the date range by 1–2 years before drawing any conclusions or making any parameter changes.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Good: return improved significantly vs previous ───────────────────
    if (prev && latest.returnPct - prev.returnPct > 8 && latest.returnPct > 0 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-return-improvement`,
        severity: "good",
        title: "Return Up — Confirm Before Scaling",
        message: `Return jumped from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% — a ${(latest.returnPct - prev.returnPct).toFixed(1)}pp gain. This is a real signal, but confirm it on a fresh date range before increasing position size. One good run is not a pattern.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Good: Sharpe improved meaningfully ───────────────────────────────
    if (prev && latest.sharpe - prev.sharpe > 0.4 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-sharpe-improvement`,
        severity: "good",
        title: "Improving — Validate Before Going Live",
        message: `Sharpe improved from ${prev.sharpe.toFixed(2)} to ${latest.sharpe.toFixed(2)} — a genuine step forward in risk-adjusted quality. Now validate it: run the same parameters on one additional symbol. Real edge generalizes; period-specific luck does not.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // Push max 2 alerts, critical first, good last
    const prioritized = [
      ...stratAlerts.filter((a) => a.severity === "critical"),
      ...stratAlerts.filter((a) => a.severity === "warning"),
      ...stratAlerts.filter((a) => a.severity === "info"),
      ...stratAlerts.filter((a) => a.severity === "good"),
    ].slice(0, 2);

    alerts.push(...prioritized);
  }

  // Sort final list: critical → warning → info, then by date desc
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, good: 3 };
  return alerts.sort((a, b) => {
    const sd = severityOrder[a.severity] - severityOrder[b.severity];
    if (sd !== 0) return sd;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
}
