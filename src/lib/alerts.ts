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
        title: "Extreme Drawdown Detected",
        message: `Max drawdown hit ${latest.drawdown.toFixed(1)}% — the strategy held losing positions too long or has no hard stop-loss. Do not run this live. Add a hard stop at 25% drawdown before running again; at the current level a single bad month could erase 3–4 months of gains.`,
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
        title: "Performance Collapsed",
        message: `Return fell from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% — a ${(prev.returnPct - latest.returnPct).toFixed(1)}pp collapse. This likely means the strategy overfitted to the previous period or the market regime changed. Next step: run the same parameters on a completely fresh date range to see if the failure persists.`,
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
        title: "Drawdown Higher Than Expected",
        message: `Max drawdown is ${latest.drawdown.toFixed(1)}% — the strategy is holding losing positions too long. A stop-loss at ${Math.round(latest.drawdown * 0.65).toFixed(0)}% drawdown would likely reduce this significantly while preserving most of the returns. Worth testing in the next run.`,
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
        title: "Poor Risk-Adjusted Returns",
        message: `A Sharpe of ${latest.sharpe.toFixed(2)} means the strategy is barely earning more than a risk-free return for the volatility it takes on. Try stricter entry conditions — signals with higher conviction trade less often but produce meaningfully better Sharpe ratios.`,
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
        title: "Performance Declined",
        message: `Return dropped from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% between runs. This often signals a regime shift — trend strategies underperform in choppy markets, and mean-reversion strategies struggle during sustained trends. Run the same strategy on the last 6 months to see if the decline is recent or ongoing.`,
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
        title: "Low Trade Count",
        message: `Only ${latest.trades} trades executed — too few to trust any metric here. A single extra win or loss would change every number significantly. Extend the date range by 1–2 years, or loosen entry thresholds before treating these results as meaningful.`,
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
        title: "Return Improved",
        message: `Return increased from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% — a ${(latest.returnPct - prev.returnPct).toFixed(1)}pp gain. Confirm this holds by running on a fresh date range before increasing position size.`,
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
        title: "Strategy Improving",
        message: `Sharpe jumped from ${prev.sharpe.toFixed(2)} to ${latest.sharpe.toFixed(2)} — a meaningful improvement in risk-adjusted quality. This is a real signal, not noise. Run on an additional symbol to confirm the improvement generalizes.`,
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
