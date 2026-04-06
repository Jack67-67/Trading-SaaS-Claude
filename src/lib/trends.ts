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
      return "Return, Sharpe, and drawdown all moved in the right direction — three signals improving at once is meaningful. The underlying edge appears to be strengthening, not just benefiting from a favorable period.";
    }
    if (returnUp && sharpeUp) {
      return "Returns and risk-adjusted quality both improved from the previous run. Two of the most important signals moving together suggests a genuine improvement in the strategy's edge.";
    }
    if (returnUp) {
      return `Return increased by ${Math.abs(returnDelta).toFixed(1)}pp from the previous run, with other metrics holding steady. A good directional signal — run again to confirm the improvement is consistent.`;
    }
    return "Key metrics are trending in the right direction compared to the previous run. The strategy is moving toward a healthier risk/return profile.";
  }

  if (trend === "at-risk") {
    if (ddUp && Math.abs(ddDelta) > 8) {
      return `Drawdown jumped ${ddDelta.toFixed(1)}pp from the previous run — the strategy is absorbing significantly more loss without generating proportionally higher returns. Review the stop-loss settings before running again.`;
    }
    if (returnDown && Math.abs(returnDelta) > 10) {
      return `Return dropped ${Math.abs(returnDelta).toFixed(1)}pp from the previous run. A move this large between runs often signals a regime shift — what worked previously may not be working in the current market environment.`;
    }
    return "This run shows signs of stress compared to the previous one. Drawdown or return has moved outside the expected range — investigate before treating these results as baseline.";
  }

  if (trend === "declining") {
    if (returnDown && ddUp) {
      return "Returns fell while drawdown rose — the strategy is both earning less and losing more than before. This double deterioration often signals a parameter that's no longer suited to current market conditions.";
    }
    if (returnDown) {
      return `Return fell ${Math.abs(returnDelta).toFixed(1)}pp from the previous run. Market conditions may have shifted — consider testing the same strategy on the most recent 6-month window to see if the decline continues.`;
    }
    return "Most metrics moved in the wrong direction compared to the previous run. The strategy logic or time window may need revisiting before continuing.";
  }

  // stable
  if (ddDown && returnUp) {
    return "Returns improved slightly and drawdown shrank from the previous run — a quiet but positive combination. No major shifts detected.";
  }
  if (ddDown) {
    return "Returns held steady while drawdown improved. Consistency here is a good signal — strategies that behave predictably across runs tend to hold up better in live trading.";
  }
  if (Math.abs(returnDelta) < 2 && Math.abs(current.sharpe - previous.sharpe) < 0.15) {
    return "Performance is consistent with the previous run — no significant changes in either direction. Stability like this is itself a signal of strategy robustness.";
  }
  return "Results are broadly in line with the previous run. Minor variations are within normal range for this strategy — no action needed.";
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
