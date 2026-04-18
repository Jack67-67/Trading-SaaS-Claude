export type EventSeverity = "warning" | "info";

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  /** ISO date string — event starts (or is the event date) */
  start: string;
  /** ISO date string — event ends (inclusive). If omitted, same as start */
  end?: string;
}

/**
 * Known high-volatility and macro-event periods.
 * Dates are YYYY-MM-DD strings (UTC).
 *
 * These are historical reference events that may overlap with a backtest's
 * tested date range. Useful to flag to users so they're aware their
 * results were shaped by unusual conditions.
 */
export const MARKET_EVENTS: MarketEvent[] = [
  // ── Macro / systemic ────────────────────────────────────────────────────────
  {
    id: "covid-crash-2020",
    title: "COVID-19 market crash",
    description: "S&P 500 fell ~34% in 33 days (Feb–Mar 2020). Extreme volatility in all asset classes.",
    severity: "warning",
    start: "2020-02-19",
    end: "2020-03-23",
  },
  {
    id: "covid-recovery-2020",
    title: "Post-COVID recovery rally",
    description: "Fastest bull market recovery on record. Momentum strategies performed unusually well.",
    severity: "info",
    start: "2020-03-24",
    end: "2020-08-31",
  },
  {
    id: "gfc-2008",
    title: "Global financial crisis",
    description: "Severe credit crunch and equity market collapse (2008–2009). Drawdowns were extreme and prolonged.",
    severity: "warning",
    start: "2008-09-01",
    end: "2009-03-09",
  },
  {
    id: "flash-crash-2010",
    title: "Flash Crash (May 2010)",
    description: "Dow dropped ~1,000 points intraday. Intraday strategies on that day saw extreme slippage.",
    severity: "warning",
    start: "2010-05-06",
    end: "2010-05-06",
  },
  {
    id: "eu-debt-crisis-2011",
    title: "European debt crisis volatility",
    description: "Sustained uncertainty around Greece and eurozone sovereign debt. High equity volatility Aug–Nov 2011.",
    severity: "info",
    start: "2011-08-01",
    end: "2011-11-30",
  },
  {
    id: "taper-tantrum-2013",
    title: "Taper tantrum",
    description: "Bond yields spiked after Bernanke hinted at tapering QE. Risk assets sold off sharply in May–Jun 2013.",
    severity: "info",
    start: "2013-05-22",
    end: "2013-06-24",
  },
  {
    id: "china-selloff-2015",
    title: "China selloff / devaluation",
    description: "China devalued the yuan; global equities fell sharply. S&P corrected ~12% in Aug 2015.",
    severity: "warning",
    start: "2015-08-18",
    end: "2015-08-26",
  },
  {
    id: "volmageddon-2018",
    title: "Volmageddon (Feb 2018)",
    description: "VIX spiked from 17 to 50 overnight. Short-volatility products collapsed. Extreme intraday swings.",
    severity: "warning",
    start: "2018-02-05",
    end: "2018-02-09",
  },
  {
    id: "q4-selloff-2018",
    title: "Q4 2018 equity selloff",
    description: "S&P fell ~20% in Q4 2018 on Fed tightening and recession fears. Worst December since the Great Depression.",
    severity: "warning",
    start: "2018-10-01",
    end: "2018-12-24",
  },
  {
    id: "fed-pivot-2022",
    title: "2022 rate hike cycle",
    description: "Fastest Fed tightening in 40 years. Equities and bonds fell together — diversification did not help.",
    severity: "warning",
    start: "2022-01-01",
    end: "2022-12-31",
  },
  {
    id: "svb-crisis-2023",
    title: "SVB / regional bank crisis",
    description: "Silicon Valley Bank collapsed in March 2023. Short-term fear spike in financials; broader contagion was contained.",
    severity: "info",
    start: "2023-03-08",
    end: "2023-03-20",
  },
  // ── Tech-specific ────────────────────────────────────────────────────────────
  {
    id: "dotcom-bust",
    title: "Dot-com bust",
    description: "Nasdaq lost ~78% peak-to-trough (2000–2002). Momentum strategies reversed sharply; value underperformed for years.",
    severity: "warning",
    start: "2000-03-10",
    end: "2002-10-09",
  },
  {
    id: "ai-bubble-risk-2023",
    title: "AI / mega-cap concentration",
    description: "2023 S&P 500 returns were heavily concentrated in 7 stocks. Equal-weight and small-cap strategies diverged significantly.",
    severity: "info",
    start: "2023-01-01",
    end: "2023-12-31",
  },
];

/**
 * Returns any events whose date range overlaps with the backtest period.
 * Both start/end are inclusive YYYY-MM-DD strings (or null = open-ended).
 */
export function getOverlappingEvents(
  backtestStart: string | null,
  backtestEnd: string | null
): MarketEvent[] {
  if (!backtestStart && !backtestEnd) return [];

  const bs = backtestStart ? new Date(backtestStart).getTime() : -Infinity;
  const be = backtestEnd ? new Date(backtestEnd).getTime() : Infinity;

  return MARKET_EVENTS.filter((ev) => {
    const es = new Date(ev.start).getTime();
    const ee = new Date(ev.end ?? ev.start).getTime();
    // Overlap: event starts before backtest ends AND event ends after backtest starts
    return es <= be && ee >= bs;
  });
}
