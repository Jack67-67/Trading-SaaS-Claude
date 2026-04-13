// ─── User / Auth ───────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  subscription_tier: "free" | "pro" | "enterprise";
}

// ─── Strategies ────────────────────────────────────────────
export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  code: string;
  created_at: string;
  updated_at: string;
}

// ─── Backtest ──────────────────────────────────────────────
export type BacktestStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BacktestConfig {
  strategy_id: string;
  name: string;
  symbol: string;
  interval: string;
  start: string | null;
  end: string | null;
  entry: Record<string, unknown>;
  risk: Record<string, unknown>;
  params: Record<string, unknown>;
  commission_pct?: number;
  slippage_pct?: number;
}

/**
 * Matches FastAPI Pydantic model: BacktestRunRequest.
 * Sent to POST /backtests/run
 */
export interface BacktestRunRequest {
  run_id: string;
  symbol: string;
  interval: string;
  start?: string | null;
  end?: string | null;
  entry: Record<string, unknown>;
  risk: Record<string, unknown>;
  params: Record<string, unknown>;
  name: string;
  commission_pct?: number;
  slippage_pct?: number;
}

export interface BacktestRun {
  id: string;
  user_id: string;
  strategy_id: string;
  status: BacktestStatus;
  config: BacktestConfig;
  results: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface BacktestMetrics {
  total_return_pct: number;
  annualized_return_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  profit_factor: number;
  total_trades: number;
  avg_trade_return_pct: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  calmar_ratio: number;
  volatility_pct: number;
  buy_and_hold_return_pct?: number;
}

/** Cost model fields returned at top level of BacktestResult (not inside metrics) */
export interface BacktestCosts {
  costs_applied: { commission_pct: number; slippage_pct: number };
  total_costs_pct: number;   // (commission + slippage) as % of initial capital
  gross_return_pct: number;  // estimated return before costs
}

export interface EquityCurvePoint {
  timestamp: string;
  equity: number;
  drawdown_pct: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  commission: number;
}

/** Shape of the `results` JSONB column written by FastAPI backend */
export interface BacktestResult {
  metrics?: BacktestMetrics;
  equity_curve?: EquityCurvePoint[];
  trades?: Trade[];
  buy_and_hold_return_pct?: number;
  costs_applied?: { commission_pct: number; slippage_pct: number };
  total_costs_pct?: number;
  gross_return_pct?: number;
  [key: string]: unknown;
}

// ─── API ───────────────────────────────────────────────────
export interface ApiError {
  detail: string;
  status_code: number;
}
