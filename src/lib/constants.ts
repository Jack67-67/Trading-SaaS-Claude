export const APP_NAME = "Quanterra";
export const APP_DESCRIPTION = "Institutional-grade backtesting infrastructure for systematic traders.";

export const TIMEFRAMES = [
  { value: "1m",  label: "1 Minute  (1m)" },
  { value: "5m",  label: "5 Minutes (5m)" },
  { value: "15m", label: "15 Minutes (15m)" },
  { value: "30m", label: "30 Minutes (30m)" },
  { value: "1h",  label: "1 Hour  (1h)" },
  { value: "4h",  label: "4 Hours (4h)" },
  { value: "1d",  label: "Daily   (1d)" },
  { value: "1w",  label: "Weekly  (1w)" },
] as const;

export const SUPPORTED_SYMBOLS = [
  "BTC/USDT",
  "ETH/USDT",
  "SPY",
  "QQQ",
  "AAPL",
  "MSFT",
  "TSLA",
  "AMZN",
  "NVDA",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
] as const;

export const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Strategies", href: "/dashboard/strategies", icon: "Code2" },
  { label: "Backtests", href: "/dashboard/backtests", icon: "FlaskConical" },
  { label: "Results", href: "/dashboard/results", icon: "BarChart3" },
] as const;
