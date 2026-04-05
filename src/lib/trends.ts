// ── Types ──────────────────────────────────────────────────────────────────────

export type TrendLabel = "improving" | "stable" | "at-risk" | "declining";

export interface RunSnapshot {
  returnPct: number;
  sharpe: number;
  drawdown: number; // absolute positive value
  winRate: number;
  trades: number;
}

export interface MetricDelta {
  key: string;
  label: string;
  currentFormatted: string;
  previousFormatted: string;
  delta: number;
  deltaFormatted: string;
  direction: "up" | "down" | "flat";
  /** true if "up" is a good thing for this metric */
  upIsGood: boolean;
  isPositive: boolean; // direction is good
}

export interface RunComparison {
  trend: TrendLabel;
  summary: string;
  deltas: MetricDelta[];
  improvingCount: number;
  decliningCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function dir(delta: number, threshold: number): "up" | "down" | "flat" {
  if (delta > threshold) return "up";
  if (delta < -threshold) return "down";
  return "flat";
}

function pctStr(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function deltaStr(delta: number, unit: string = "pp"): string {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} ${unit}`;
}

// ── Core comparison ────────────────────────────────────────────────────────────

export function compareTwoRuns(
  current: RunSnapshot,
  previous: RunSnapshot
): RunComparison {
  const returnDelta   = current.returnPct - previous.returnPct;
  const sharpeDelta   = current.sharpe    - previous.sharpe;
  const drawdownDelta = current.drawdown  - previous.drawdown; // positive = got worse
  const winRateDelta  = current.winRate   - previous.winRate;

  const deltas: MetricDelta[] = [
    {
      key: "return",
      label: "Total Return",
      currentFormatted:  `${current.returnPct.toFixed(1)}%`,
      previousFormatted: `${previous.returnPct.toFixed(1)}%`,
      delta: returnDelta,
      deltaFormatted: pctStr(returnDelta),
      direction: dir(returnDelta, 1.5),
      upIsGood: true,
      isPositive: returnDelta > 1.5,
    },
    {
      key: "sharpe",
      label: "Sharpe Ratio",
      currentFormatted:  current.sharpe.toFixed(2),
      previousFormatted: previous.sharpe.toFixed(2),
      delta: sharpeDelta,
      deltaFormatted: deltaStr(sharpeDelta, ""),
      direction: dir(sharpeDelta, 0.15),
      upIsGood: true,
      isPositive: sharpeDelta > 0.15,
    },
    {
      key: "drawdown",
      label: "Max Drawdown",
      currentFormatted:  `${current.drawdown.toFixed(1)}%`,
      previousFormatted: `${previous.drawdown.toFixed(1)}%`,
      delta: drawdownDelta,
      deltaFormatted: pctStr(drawdownDelta),
      direction: dir(drawdownDelta, 2),
      upIsGood: false,           // lower drawdown is better
      isPositive: drawdownDelta < -2,  // got better = shrank
    },
    {
      key: "winRate",
      label: "Win Rate",
      currentFormatted:  `${current.winRate.toFixed(1)}%`,
      previousFormatted: `${previous.winRate.toFixed(1)}%`,
      delta: winRateDelta,
      deltaFormatted: pctStr(winRateDelta),
      direction: dir(winRateDelta, 2),
      upIsGood: true,
      isPositive: winRateDelta > 2,
    },
  ];

  const improvingCount = deltas.filter((d) => d.isPositive).length;
  const decliningCount = deltas.filter(
    (d) => !d.isPositive && d.direction !== "flat"
  ).length;

  // Trend classification
  const returnDrop   = returnDelta   < -10;
  const drawdownSpike = drawdownDelta > 8;
  const sharpeGood   = sharpeDelta   > 0.15;
  const returnGood   = returnDelta   > 3;

  let trend: TrendLabel;
  if (drawdownSpike || returnDrop) {
    trend = "at-risk";
  } else if (improvingCount >= 3 || (returnGood && sharpeGood)) {
    trend = "improving";
  } else if (decliningCount >= 3) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  const summary = buildSummary(trend, deltas, current, previous);

  return { trend, summary, deltas, improvingCount, decliningCount };
}

// ── Summary generation ─────────────────────────────────────────────────────────

function buildSummary(
  trend: TrendLabel,
  deltas: MetricDelta[],
  current: RunSnapshot,
  previous: RunSnapshot
): string {
  const returnUp   = deltas.find((d) => d.key === "return")!.direction === "up";
  const returnDown = deltas.find((d) => d.key === "return")!.direction === "down";
  const sharpeUp   = deltas.find((d) => d.key === "sharpe")!.direction === "up";
  const ddUp       = deltas.find((d) => d.key === "drawdown")!.direction === "up"; // worse
  const ddDown     = deltas.find((d) => d.key === "drawdown")!.direction === "down"; // better
  const returnDelta = current.returnPct - previous.returnPct;
  const ddDelta     = current.drawdown  - previous.drawdown;

  if (trend === "improving") {
    if (returnUp && sharpeUp && ddDown) {
      return "Performance improved across the board — higher returns, better risk-adjusted quality, and lower drawdown compared to the previous run.";
    }
    if (returnUp && sharpeUp) {
      return "Returns and risk-adjusted quality both improved compared to the previous run. The strategy is trending in the right direction.";
    }
    if (returnUp) {
      return `Return increased by ${Math.abs(returnDelta).toFixed(1)}pp compared to the previous run. Most other metrics held steady or improved.`;
    }
    return "Performance improved compared to the previous run. Key metrics are trending in the right direction.";
  }

  if (trend === "at-risk") {
    if (ddUp && Math.abs(ddDelta) > 8) {
      return `Drawdown increased significantly — up ${ddDelta.toFixed(1)}pp from the previous run. The strategy is taking on more risk without a proportional improvement in returns.`;
    }
    if (returnDown && Math.abs(returnDelta) > 10) {
      return `Return dropped ${Math.abs(returnDelta).toFixed(1)}pp compared to the previous run. Review the strategy's parameters before running again.`;
    }
    return "This run shows signs of stress compared to the previous one. Drawdown or return has moved outside the expected range.";
  }

  if (trend === "declining") {
    if (returnDown && ddUp) {
      return "Returns declined while drawdown increased — the strategy is both earning less and taking on more risk than before.";
    }
    if (returnDown) {
      return `Performance declined compared to the previous run — return fell by ${Math.abs(returnDelta).toFixed(1)}pp. Market conditions may have shifted.`;
    }
    return "Most metrics moved in the wrong direction compared to the previous run. Consider reviewing the strategy logic or testing on a different time window.";
  }

  // stable
  if (ddDown && returnUp) {
    return "Returns improved slightly and drawdown shrank — a positive sign of improving risk control. No major shifts detected.";
  }
  if (ddDown) {
    return "Returns held steady while drawdown improved. The strategy is showing consistent behavior with better risk control.";
  }
  if (Math.abs(returnDelta) < 2 && Math.abs(current.sharpe - previous.sharpe) < 0.15) {
    return "Performance is consistent with the previous run — no significant changes in either direction. The strategy is behaving as expected.";
  }
  return "Results are broadly in line with the previous run. Minor variations are within the normal range for this strategy.";
}

// ── Multi-run trend ────────────────────────────────────────────────────────────

/**
 * Given runs sorted oldest-first, return the trend label
 * based on the last two completed runs.
 */
export function computeStrategyTrend(runs: RunSnapshot[]): TrendLabel | null {
  if (runs.length < 2) return null;
  const sorted = [...runs]; // assume already sorted oldest-first
  const latest = sorted[sorted.length - 1];
  const prev   = sorted[sorted.length - 2];
  return compareTwoRuns(latest, prev).trend;
}
