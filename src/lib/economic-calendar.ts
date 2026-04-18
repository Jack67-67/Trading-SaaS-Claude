/**
 * Forward-looking economic calendar for trade guards.
 *
 * These are scheduled high-impact events that historically cause elevated
 * volatility around their release. Used to warn users when their strategy
 * would be running during a known risk window.
 *
 * All dates are YYYY-MM-DD (ET/US market calendar).
 * This is NOT a live feed — it is a hardcoded calendar that should be
 * updated annually. Current coverage: 2025-2026.
 */

export type GuardLevel = "danger" | "caution" | "upcoming";
export type EventCategory = "fomc" | "cpi" | "nfp" | "earnings" | "options" | "other";

export interface EconomicEvent {
  id: string;
  title: string;
  /** Short label for compact UI */
  short: string;
  category: EventCategory;
  /** Decision / release day (YYYY-MM-DD) */
  date: string;
  impact: "high" | "medium";
  description: string;
}

// ── 2025 Calendar ────────────────────────────────────────────────────────────

const EVENTS_2025: EconomicEvent[] = [
  // FOMC decision days (day 2 of each meeting)
  { id: "fomc-2025-01", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-01-29", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-03", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-03-19", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-05", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-05-07", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-06", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-06-18", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-07", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-07-30", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-09", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-09-17", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-10", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-10-29", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2025-12", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2025-12-10", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },

  // CPI releases (typically 2nd or 3rd week of month)
  { id: "cpi-2025-01", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-01-15", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-02", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-02-12", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-03", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-03-12", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-04", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-04-10", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-05", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-05-13", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-06", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-06-11", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-07", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-07-15", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-08", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-08-13", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-09", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-09-10", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-10", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-10-14", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-11", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-11-12", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2025-12", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2025-12-10", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },

  // NFP — Nonfarm Payrolls (first Friday of each month)
  { id: "nfp-2025-01", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-01-10", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-02", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-02-07", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-03", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-03-07", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-04", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-04-04", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-05", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-05-02", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-06", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-06-06", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-07", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-07-03", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-08", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-08-01", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-09", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-09-05", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-10", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-10-03", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-11", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-11-07", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2025-12", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2025-12-05", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },

  // Earnings season peaks (weeks when the bulk of S&P 500 earnings land)
  { id: "earnings-2025-q1", title: "Peak Earnings Season (Q4 2024)", short: "Earnings", category: "earnings", date: "2025-01-23", impact: "medium", description: "Peak week for Q4 2024 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },
  { id: "earnings-2025-q2", title: "Peak Earnings Season (Q1 2025)", short: "Earnings", category: "earnings", date: "2025-04-24", impact: "medium", description: "Peak week for Q1 2025 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },
  { id: "earnings-2025-q3", title: "Peak Earnings Season (Q2 2025)", short: "Earnings", category: "earnings", date: "2025-07-24", impact: "medium", description: "Peak week for Q2 2025 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },
  { id: "earnings-2025-q4", title: "Peak Earnings Season (Q3 2025)", short: "Earnings", category: "earnings", date: "2025-10-23", impact: "medium", description: "Peak week for Q3 2025 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },

  // Quadruple witching (quarterly options/futures expiration — 3rd Friday of Mar/Jun/Sep/Dec)
  { id: "qw-2025-03", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2025-03-21", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
  { id: "qw-2025-06", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2025-06-20", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
  { id: "qw-2025-09", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2025-09-19", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
  { id: "qw-2025-12", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2025-12-19", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
];

// ── 2026 Calendar ────────────────────────────────────────────────────────────

const EVENTS_2026: EconomicEvent[] = [
  // FOMC decision days
  { id: "fomc-2026-01", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-01-28", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-03", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-03-18", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-04", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-04-29", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-06", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-06-10", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-07", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-07-29", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-09", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-09-16", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-10", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-10-28", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },
  { id: "fomc-2026-12", title: "FOMC Rate Decision", short: "FOMC", category: "fomc", date: "2026-12-09", impact: "high", description: "Federal Reserve interest rate decision. Markets typically see elevated volatility 1–2 days on either side." },

  // CPI releases
  { id: "cpi-2026-01", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-01-14", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-02", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-02-11", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-03", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-03-11", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-04", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-04-14", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-05", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-05-13", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-06", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-06-10", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-07", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-07-14", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-08", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-08-12", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-09", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-09-09", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-10", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-10-14", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-11", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-11-11", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },
  { id: "cpi-2026-12", title: "CPI Inflation Report", short: "CPI", category: "cpi", date: "2026-12-09", impact: "high", description: "Consumer Price Index release. Surprise readings regularly move equities, bonds, and USD by 1–2% on the day." },

  // NFP — first Friday of each month
  { id: "nfp-2026-01", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-01-09", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-02", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-02-06", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-03", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-03-06", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-04", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-04-03", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-05", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-05-01", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-06", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-06-05", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-07", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-07-02", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-08", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-08-07", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-09", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-09-04", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-10", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-10-02", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-11", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-11-06", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },
  { id: "nfp-2026-12", title: "Nonfarm Payrolls (NFP)", short: "NFP", category: "nfp", date: "2026-12-04", impact: "high", description: "Monthly jobs report. Strong or weak surprises often trigger broad market swings within the first hour." },

  // Earnings season peaks
  { id: "earnings-2026-q1", title: "Peak Earnings Season (Q4 2025)", short: "Earnings", category: "earnings", date: "2026-01-22", impact: "medium", description: "Peak week for Q4 2025 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },
  { id: "earnings-2026-q2", title: "Peak Earnings Season (Q1 2026)", short: "Earnings", category: "earnings", date: "2026-04-23", impact: "medium", description: "Peak week for Q1 2026 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },
  { id: "earnings-2026-q3", title: "Peak Earnings Season (Q2 2026)", short: "Earnings", category: "earnings", date: "2026-07-23", impact: "medium", description: "Peak week for Q2 2026 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },
  { id: "earnings-2026-q4", title: "Peak Earnings Season (Q3 2026)", short: "Earnings", category: "earnings", date: "2026-10-22", impact: "medium", description: "Peak week for Q3 2026 earnings. Major bank, tech, and retail reports in a 5-day window cause sector-wide gap risk." },

  // Quadruple witching
  { id: "qw-2026-03", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2026-03-20", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
  { id: "qw-2026-06", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2026-06-19", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
  { id: "qw-2026-09", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2026-09-18", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
  { id: "qw-2026-12", title: "Quadruple Witching", short: "Options Exp.", category: "options", date: "2026-12-18", impact: "medium", description: "Simultaneous expiration of stock index futures, stock index options, stock options, and single-stock futures. Unusual volume and intraday swings common." },
];

export const ECONOMIC_CALENDAR: EconomicEvent[] = [
  ...EVENTS_2025,
  ...EVENTS_2026,
];

// ── Guard detection ──────────────────────────────────────────────────────────

/** Days out at which each guard level is triggered. */
const DANGER_WINDOW  = 1; // today or tomorrow
const CAUTION_WINDOW = 3; // within 3 days
const UPCOMING_WINDOW = 7; // within a week

export interface ActiveGuard {
  level: GuardLevel;
  /** Events driving this guard, sorted by date */
  events: EconomicEvent[];
  /** Days until the nearest event (0 = today, negative = was yesterday) */
  daysUntil: number;
}

/**
 * Returns the highest-severity guard active near `today`, or null if
 * no events are within the upcoming window.
 *
 * Only high-impact events trigger "danger"; medium-impact events only
 * reach "caution" at most.
 */
export function getTodayGuard(today: Date = new Date()): ActiveGuard | null {
  const todayMs = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Score each event by proximity
  const nearby: { event: EconomicEvent; days: number }[] = [];
  for (const ev of ECONOMIC_CALENDAR) {
    const evMs = new Date(ev.date + "T00:00:00Z").getTime();
    const days = Math.round((evMs - todayMs) / 86_400_000);
    // Include yesterday (day -1) through the upcoming window
    if (days >= -1 && days <= UPCOMING_WINDOW) {
      nearby.push({ event: ev, days });
    }
  }

  if (nearby.length === 0) return null;

  // Sort by proximity
  nearby.sort((a, b) => Math.abs(a.days) - Math.abs(b.days));

  // Determine overall guard level
  let level: GuardLevel = "upcoming";
  let daysUntil = nearby[0].days;

  for (const { event, days } of nearby) {
    if (event.impact === "high") {
      if (Math.abs(days) <= DANGER_WINDOW) {
        level = "danger";
        daysUntil = days;
        break;
      }
      if (days <= CAUTION_WINDOW && (level as GuardLevel) !== "danger") {
        level = "caution";
        daysUntil = days;
      }
    } else {
      // medium impact: max caution
      if (Math.abs(days) <= DANGER_WINDOW && (level as GuardLevel) !== "danger" && level !== "caution") {
        level = "caution";
        daysUntil = days;
      }
    }
  }

  return {
    level,
    events: nearby.map((n) => n.event),
    daysUntil,
  };
}

/** Human-readable label for how far away an event is. */
export function daysLabel(days: number): string {
  if (days < 0) return "yesterday";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
