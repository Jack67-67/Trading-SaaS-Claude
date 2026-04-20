// ── Execution readiness checks ───────────────────────────────────────────────
// Pure logic — no Supabase, no fetch. All params passed in.
// Used to compute whether a session can safely transition to live trading.

export interface ReadinessCheck {
  id:       string;
  label:    string;
  passed:   boolean;
  detail:   string;
  blocking: boolean;   // if true, prevents live trading; false = warning only
}

export interface ReadinessSummary {
  allBlockersPassed: boolean;
  passedBlockers:    number;
  totalBlockers:     number;
  checks:            ReadinessCheck[];
}

export interface ReadinessParams {
  // Broker
  brokerConnected:     boolean;
  brokerStatus:        string | null;     // "connected" | "error" | null
  accountStatus:       string | null;     // "ACTIVE" | other | null (from broker API)
  buyingPower:         number | null;     // from cached or live fetch
  estimatedOrderCost:  number;            // from computeShadowSignal

  // Strategy
  hasMetrics:          boolean;
  profitFactor:        number | null;
  sharpeRatio:         number | null;
  totalTrades:         number | null;

  // Loss limits
  weeklyLossPct:       number | null;
  maxWeeklyLossPct:    number;
  monthlyLossPct:      number | null;
  maxMonthlyLossPct:   number;

  // Session state
  sessionStopped:      boolean;
  sessionPaused:       boolean;

  // Event guard
  eventDanger:         boolean;
  eventName:           string | null;

  // Data freshness
  dataFreshMins:       number | null;     // null = never scanned
  interval?:           string;            // candle interval — used for staleness threshold
}

export function computeExecutionReadiness(p: ReadinessParams): ReadinessSummary {
  const checks: ReadinessCheck[] = [];

  // ── 1. Broker connected ───────────────────────────────────────────────────
  const brokerOk = p.brokerConnected && p.brokerStatus === "connected";
  checks.push({
    id:       "broker_connected",
    label:    "Broker connected",
    passed:   brokerOk,
    detail:   !p.brokerConnected
      ? "No broker linked to this session. Connect one in Settings → Broker Connection, then link it here."
      : p.brokerStatus !== "connected"
      ? "Broker connection shows an error. Refresh it in Settings to re-verify."
      : "Broker account verified and accessible.",
    blocking: true,
  });

  // ── 2. Account status ─────────────────────────────────────────────────────
  const accountOk = p.accountStatus === "ACTIVE";
  checks.push({
    id:       "account_active",
    label:    "Account is ACTIVE",
    passed:   accountOk,
    detail:   !p.accountStatus
      ? "Account status unknown — refresh the broker connection to verify."
      : accountOk
      ? "Broker account status is ACTIVE and ready to trade."
      : `Broker account status is "${p.accountStatus}" — must be ACTIVE for live trading.`,
    blocking: true,
  });

  // ── 3. Buying power ───────────────────────────────────────────────────────
  const bpOk = p.buyingPower !== null && p.buyingPower >= p.estimatedOrderCost;
  checks.push({
    id:       "buying_power",
    label:    "Sufficient buying power",
    passed:   bpOk,
    detail:   p.buyingPower === null
      ? `Buying power unknown — refresh broker connection. Estimated order: ~$${p.estimatedOrderCost.toLocaleString()}.`
      : bpOk
      ? `$${p.buyingPower.toLocaleString()} available — covers estimated order of ~$${p.estimatedOrderCost.toLocaleString()}.`
      : `Only $${p.buyingPower.toLocaleString()} available — estimated order requires ~$${p.estimatedOrderCost.toLocaleString()}.`,
    blocking: true,
  });

  // ── 4. Strategy has positive edge ─────────────────────────────────────────
  const edgeOk = p.hasMetrics &&
    (p.profitFactor ?? 0) >= 1.0 &&
    (p.sharpeRatio  ?? 0) >= 0;
  checks.push({
    id:       "strategy_edge",
    label:    "Strategy shows positive edge",
    passed:   edgeOk,
    detail:   !p.hasMetrics
      ? "No backtest data yet — run a simulation to generate metrics."
      : edgeOk
      ? `Profit factor ${p.profitFactor?.toFixed(2)}, Sharpe ${p.sharpeRatio?.toFixed(2)} over ${p.totalTrades} trades — edge confirmed.`
      : `Profit factor ${p.profitFactor?.toFixed(2)} or Sharpe ${p.sharpeRatio?.toFixed(2)} below minimum — strategy must show a positive edge before going live.`,
    blocking: true,
  });

  // ── 5. Weekly loss limit not exceeded ─────────────────────────────────────
  const weeklyOk = p.weeklyLossPct === null || p.weeklyLossPct > -p.maxWeeklyLossPct;
  checks.push({
    id:       "weekly_loss",
    label:    "Within weekly loss limit",
    passed:   weeklyOk,
    detail:   p.weeklyLossPct !== null
      ? weeklyOk
        ? `7-day P&L ${p.weeklyLossPct >= 0 ? "+" : ""}${p.weeklyLossPct.toFixed(1)}% — within −${p.maxWeeklyLossPct}% limit.`
        : `7-day P&L ${p.weeklyLossPct.toFixed(1)}% has exceeded the −${p.maxWeeklyLossPct}% weekly limit. Session would auto-pause.`
      : `No recent P&L data. Limit is set to −${p.maxWeeklyLossPct}%.`,
    blocking: true,
  });

  // ── 6. Monthly loss limit not exceeded ────────────────────────────────────
  const monthlyOk = p.monthlyLossPct === null || p.monthlyLossPct > -p.maxMonthlyLossPct;
  checks.push({
    id:       "monthly_loss",
    label:    "Within monthly loss limit",
    passed:   monthlyOk,
    detail:   p.monthlyLossPct !== null
      ? monthlyOk
        ? `30-day P&L ${p.monthlyLossPct >= 0 ? "+" : ""}${p.monthlyLossPct.toFixed(1)}% — within −${p.maxMonthlyLossPct}% limit.`
        : `30-day P&L ${p.monthlyLossPct.toFixed(1)}% has exceeded the −${p.maxMonthlyLossPct}% monthly limit. Session would auto-pause.`
      : `No recent P&L data. Limit is set to −${p.maxMonthlyLossPct}%.`,
    blocking: true,
  });

  // ── 7. Session is active ──────────────────────────────────────────────────
  const sessionOk = !p.sessionStopped && !p.sessionPaused;
  checks.push({
    id:       "session_active",
    label:    "Session is active",
    passed:   sessionOk,
    detail:   p.sessionStopped
      ? "Session has been permanently stopped via kill switch. Create a new session."
      : p.sessionPaused
      ? "Session is paused. Resume it before switching to live mode."
      : "Session is active and running.",
    blocking: true,
  });

  // ── 8. No high-impact event (warning, not blocking) ───────────────────────
  checks.push({
    id:       "event_guard",
    label:    "No major market event today",
    passed:   !p.eventDanger,
    detail:   p.eventDanger
      ? `High-impact event active${p.eventName ? ` (${p.eventName})` : ""}. Autotrading will auto-pause if "Pause on events" is enabled.`
      : "No high-impact economic events detected for today.",
    blocking: false,
  });

  // ── 9. Data freshness (warning, not blocking) ─────────────────────────────
  // Threshold is interval-aware: short timeframes go stale much faster
  if (p.dataFreshMins !== null) {
    const freshnessLimits: Record<string, number> = {
      "1m": 3, "3m": 5, "5m": 10, "15m": 20, "30m": 35,
      "1h": 70, "2h": 130, "4h": 250, "1d": 1500, "3d": 4500, "1w": 10500,
    };
    const threshold = p.interval ? (freshnessLimits[p.interval] ?? 60) : 60;
    const fresh = p.dataFreshMins < threshold;
    checks.push({
      id:       "data_fresh",
      label:    "Signal data is current",
      passed:   fresh,
      detail:   fresh
        ? `Last scan ${Math.round(p.dataFreshMins)}m ago — signals are current for ${p.interval ?? "this"} interval.`
        : `Last scan ${Math.round(p.dataFreshMins)}m ago — stale for ${p.interval ?? "this"} interval (limit ${threshold}m). Consider refreshing.`,
      blocking: false,
    });
  }

  const blockers        = checks.filter(c => c.blocking);
  const passedBlockers  = blockers.filter(c => c.passed).length;

  return {
    allBlockersPassed: blockers.every(c => c.passed),
    passedBlockers,
    totalBlockers: blockers.length,
    checks,
  };
}
