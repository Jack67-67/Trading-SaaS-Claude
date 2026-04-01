export const APP_NAME = "Quanterra";
export const APP_DESCRIPTION = "Institutional-grade backtesting infrastructure for systematic traders.";

export const TIMEFRAMES = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
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
