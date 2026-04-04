export type AlertSeverity = "critical" | "warning" | "info";

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
        message: `Max drawdown reached ${latest.drawdown.toFixed(1)}% — significantly above the safe threshold. Review position sizing.`,
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
        message: `Return dropped from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% — a ${(prev.returnPct - latest.returnPct).toFixed(1)}pp fall. Investigate recent changes.`,
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
        message: `Max drawdown is ${latest.drawdown.toFixed(1)}%. Consider tightening stop-loss rules to protect capital.`,
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
        message: `Sharpe ratio of ${latest.sharpe.toFixed(2)} indicates returns may not justify the risk. Review entry/exit conditions.`,
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
        title: "Strategy Performance Declined",
        message: `Return fell from ${prev.returnPct.toFixed(1)}% to ${latest.returnPct.toFixed(1)}% since the last run. Market conditions may have shifted.`,
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
        message: `Only ${latest.trades} trades executed. Results may not be statistically significant — consider a longer backtest window.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // ── Info: moderate Sharpe improvement ────────────────────────────────────
    if (prev && latest.sharpe - prev.sharpe > 0.4 && stratAlerts.length < 2) {
      stratAlerts.push({
        id: `${latest.id}-sharpe-improvement`,
        severity: "info",
        title: "Risk-Adjusted Quality Improving",
        message: `Sharpe improved from ${prev.sharpe.toFixed(2)} to ${latest.sharpe.toFixed(2)}. Recent parameter changes appear to be paying off.`,
        strategyId: latest.strategyId,
        strategyName: latest.strategyName,
        runId: latest.id,
        symbol: latest.symbol,
        completedAt: latest.completedAt,
      });
    }

    // Push max 2 alerts, critical first
    const prioritized = [
      ...stratAlerts.filter((a) => a.severity === "critical"),
      ...stratAlerts.filter((a) => a.severity === "warning"),
      ...stratAlerts.filter((a) => a.severity === "info"),
    ].slice(0, 2);

    alerts.push(...prioritized);
  }

  // Sort final list: critical → warning → info, then by date desc
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => {
    const sd = severityOrder[a.severity] - severityOrder[b.severity];
    if (sd !== 0) return sd;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
}
