// ── Portfolio risk engine ─────────────────────────────────────────────────────
// Pure logic — no Supabase, no fetch.
// Computes portfolio-level exposure, loss, and limit violations.

export interface SessionRiskSnapshot {
  sessionId:      string;
  name:           string;
  symbol:         string;
  interval:       string;
  tradingMode:    string;
  status:         string;
  allocatedCap:   number;
  currentEquity:  number;
  pnl:            number;
  pnlPct:         number;
  weeklyLossPct:  number | null;
  monthlyLossPct: number | null;
  openTradesCount: number;
  autoEnabled:    boolean;
}

export interface PortfolioSnapshot {
  totalAllocated:   number;
  totalEquity:      number;
  totalPnl:         number;
  totalPnlPct:      number;
  activeCount:      number;
  pausedCount:      number;
  stoppedCount:     number;
  openTradesTotal:  number;
  worstWeeklyLoss:  number | null;
  worstMonthlyLoss: number | null;
  sessions:         SessionRiskSnapshot[];
}

export interface PortfolioControls {
  maxPortfolioRiskPct:    number;   // % of total capital at risk simultaneously
  maxRiskPerStrategyPct:  number;   // % per strategy session
  maxSimultaneousTrades:  number;   // across all sessions
  maxWeeklyLossPct:       number;
  maxMonthlyLossPct:      number;
  pauseOnEvents:          boolean;
}

export type ViolationType =
  | 'weekly_loss'
  | 'monthly_loss'
  | 'max_trades'
  | 'max_portfolio_risk';

export interface LimitViolation {
  type:             ViolationType;
  severity:         'warning' | 'critical';
  message:          string;
  currentValue:     number;
  limitValue:       number;
  affectedSessions: string[];
}

export function computePortfolioSnapshot(sessions: SessionRiskSnapshot[]): PortfolioSnapshot {
  const totalAllocated  = sessions.reduce((s, sess) => s + sess.allocatedCap, 0);
  const totalEquity     = sessions.reduce((s, sess) => s + sess.currentEquity, 0);
  const totalPnl        = totalEquity - totalAllocated;
  const totalPnlPct     = totalAllocated > 0 ? (totalPnl / totalAllocated) * 100 : 0;
  const openTradesTotal = sessions.reduce((s, sess) => s + sess.openTradesCount, 0);

  const losses7d  = sessions.map(s => s.weeklyLossPct).filter((v): v is number => v !== null && v < 0);
  const losses30d = sessions.map(s => s.monthlyLossPct).filter((v): v is number => v !== null && v < 0);

  return {
    totalAllocated,
    totalEquity,
    totalPnl,
    totalPnlPct,
    activeCount:      sessions.filter(s => s.status === 'active').length,
    pausedCount:      sessions.filter(s => s.status === 'paused').length,
    stoppedCount:     sessions.filter(s => s.status === 'stopped').length,
    openTradesTotal,
    worstWeeklyLoss:  losses7d.length  > 0 ? Math.min(...losses7d)  : null,
    worstMonthlyLoss: losses30d.length > 0 ? Math.min(...losses30d) : null,
    sessions,
  };
}

export function checkPortfolioLimits(
  snap: PortfolioSnapshot,
  controls: PortfolioControls,
): LimitViolation[] {
  const violations: LimitViolation[] = [];

  // Weekly loss
  if (snap.worstWeeklyLoss !== null && snap.worstWeeklyLoss < -controls.maxWeeklyLossPct) {
    violations.push({
      type:     'weekly_loss',
      severity: snap.worstWeeklyLoss < -controls.maxWeeklyLossPct * 1.25 ? 'critical' : 'warning',
      message:  `Worst weekly loss ${snap.worstWeeklyLoss.toFixed(1)}% — exceeds −${controls.maxWeeklyLossPct}% limit`,
      currentValue: snap.worstWeeklyLoss,
      limitValue:   -controls.maxWeeklyLossPct,
      affectedSessions: snap.sessions
        .filter(s => s.weeklyLossPct !== null && s.weeklyLossPct < -controls.maxWeeklyLossPct)
        .map(s => s.sessionId),
    });
  }

  // Monthly loss
  if (snap.worstMonthlyLoss !== null && snap.worstMonthlyLoss < -controls.maxMonthlyLossPct) {
    violations.push({
      type:     'monthly_loss',
      severity: 'critical',
      message:  `Worst monthly loss ${snap.worstMonthlyLoss.toFixed(1)}% — exceeds −${controls.maxMonthlyLossPct}% limit`,
      currentValue: snap.worstMonthlyLoss,
      limitValue:   -controls.maxMonthlyLossPct,
      affectedSessions: snap.sessions
        .filter(s => s.monthlyLossPct !== null && s.monthlyLossPct < -controls.maxMonthlyLossPct)
        .map(s => s.sessionId),
    });
  }

  // Max simultaneous trades
  if (snap.openTradesTotal > controls.maxSimultaneousTrades) {
    violations.push({
      type:     'max_trades',
      severity: 'warning',
      message:  `${snap.openTradesTotal} open trades across portfolio — limit is ${controls.maxSimultaneousTrades}`,
      currentValue: snap.openTradesTotal,
      limitValue:   controls.maxSimultaneousTrades,
      affectedSessions: snap.sessions.filter(s => s.openTradesCount > 0).map(s => s.sessionId),
    });
  }

  return violations;
}

/** 0–100 scale: how close is the portfolio to its limits */
export function portfolioCapacityUsed(
  snap: PortfolioSnapshot,
  controls: PortfolioControls,
): number {
  const tradePct  = controls.maxSimultaneousTrades > 0
    ? (snap.openTradesTotal / controls.maxSimultaneousTrades) * 100
    : 0;
  const weeklyPct = snap.worstWeeklyLoss !== null
    ? (Math.abs(Math.min(0, snap.worstWeeklyLoss)) / controls.maxWeeklyLossPct) * 100
    : 0;
  const monthlyPct = snap.worstMonthlyLoss !== null
    ? (Math.abs(Math.min(0, snap.worstMonthlyLoss)) / controls.maxMonthlyLossPct) * 100
    : 0;
  return Math.min(100, Math.max(tradePct, weeklyPct, monthlyPct));
}
