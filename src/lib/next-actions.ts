import type { TrendLabel } from "@/lib/trends";
import type { AppAlert } from "@/lib/alerts";

export type ActionPriority = "urgent" | "important" | "suggested";
export type ActionIcon = "alert-critical" | "alert-warning" | "trending-down" | "trending-up" | "play" | "check" | "search";

export interface NextActionItem {
  id: string;
  priority: ActionPriority;
  icon: ActionIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
}

interface PortfolioState {
  alerts: AppAlert[];
  strategies: {
    id: string;
    name: string;
    trend: TrendLabel | null;
    returnPct: number;
    latestRunId: string;
  }[];
  totalRuns: number;
  totalStrategies: number;
}

export function generateNextActions(state: PortfolioState): NextActionItem[] {
  const actions: NextActionItem[] = [];

  const criticalAlerts   = state.alerts.filter((a) => a.severity === "critical");
  const warningAlerts    = state.alerts.filter((a) => a.severity === "warning");
  const decliningList    = state.strategies.filter((s) => s.trend === "declining");
  const atRiskList       = state.strategies.filter((s) => s.trend === "at-risk");
  const improvingList    = state.strategies.filter((s) => s.trend === "improving");

  // ── Urgent ───────────────────────────────────────────────────────────────

  if (state.totalStrategies === 0) {
    actions.push({
      id: "create-strategy",
      priority: "urgent",
      icon: "play",
      title: "Create your first strategy",
      description: "No strategies yet. Start with AI Strategy — describe what you want and get a ready-to-run strategy in seconds. No code required.",
      href: "/dashboard/ai-strategy",
      cta: "Create Strategy",
    });
  } else if (state.totalRuns === 0) {
    actions.push({
      id: "run-first-backtest",
      priority: "urgent",
      icon: "play",
      title: "Run your first backtest",
      description: "You have a strategy but no completed runs. Run a backtest to see how it performs historically before committing any capital.",
      href: "/dashboard/backtests",
      cta: "Go to Backtests",
    });
  }

  if (criticalAlerts.length > 0) {
    const first = criticalAlerts[0];
    const shortMessage = first.message.split(".")[0];
    actions.push({
      id: `critical-${first.id}`,
      priority: "urgent",
      icon: "alert-critical",
      title: first.title,
      description: `${first.strategyName} · ${first.symbol} — ${shortMessage}.`,
      href: `/dashboard/results/${first.runId}`,
      cta: "View & Fix",
    });
  }

  // ── Important ─────────────────────────────────────────────────────────────

  if (decliningList.length > 0) {
    const worst = [...decliningList].sort((a, b) => a.returnPct - b.returnPct)[0];
    actions.push({
      id: `declining-${worst.id}`,
      priority: "important",
      icon: "trending-down",
      title: `Review declining strategy: ${worst.name}`,
      description: "This strategy has deteriorated across recent runs. Check what changed — parameters, date range, or market regime — and adjust before running again.",
      href: `/dashboard/results/${worst.latestRunId}`,
      cta: "Review Results",
    });
  } else if (atRiskList.length > 0) {
    const first = atRiskList[0];
    actions.push({
      id: `atrisk-${first.id}`,
      priority: "important",
      icon: "alert-warning",
      title: `At-risk strategy needs attention: ${first.name}`,
      description: "Drawdown or return has moved outside the expected range. Review the latest run before running this strategy live.",
      href: `/dashboard/results/${first.latestRunId}`,
      cta: "Review Results",
    });
  } else if (warningAlerts.length > 0 && actions.filter((a) => a.priority !== "suggested").length < 2) {
    const first = warningAlerts[0];
    const shortMessage = first.message.split(".")[0];
    actions.push({
      id: `warning-${first.id}`,
      priority: "important",
      icon: "alert-warning",
      title: first.title,
      description: `${first.strategyName} · ${shortMessage}.`,
      href: `/dashboard/results/${first.runId}`,
      cta: "View Run",
    });
  }

  // ── Suggested ─────────────────────────────────────────────────────────────

  if (improvingList.length > 0 && criticalAlerts.length === 0 && decliningList.length === 0) {
    const best = [...improvingList].sort((a, b) => b.returnPct - a.returnPct)[0];
    actions.push({
      id: `validate-${best.id}`,
      priority: "suggested",
      icon: "check",
      title: `Validate ${best.name} on new data`,
      description: "This strategy is trending up. Run it on a fresh date range or additional symbol to confirm the edge holds — that is the step before going live.",
      href: `/dashboard/results/${best.latestRunId}`,
      cta: "View Strategy",
    });
  } else if (state.totalRuns > 0 && actions.filter((a) => a.priority === "suggested").length === 0) {
    actions.push({
      id: "run-again",
      priority: "suggested",
      icon: "search",
      title: "Run another backtest to track improvement",
      description: "Running the same strategy on a different date range shows whether performance is consistent or market-dependent. Trend data builds with each run.",
      href: "/dashboard/backtests",
      cta: "New Backtest",
    });
  }

  // Sort and cap at 3: urgent → important → suggested
  return [
    ...actions.filter((a) => a.priority === "urgent"),
    ...actions.filter((a) => a.priority === "important"),
    ...actions.filter((a) => a.priority === "suggested"),
  ].slice(0, 3);
}
