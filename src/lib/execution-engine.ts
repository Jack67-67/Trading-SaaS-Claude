// ── Execution engine ──────────────────────────────────────────────────────────
// Pure logic — no Supabase. Builds orders from signals, tracks state.

import type { ShadowSignal } from './autotrading-ai';

export type TradingMode = 'paper' | 'shadow' | 'live_prep' | 'live';

export type OrderStatus =
  | 'pending'
  | 'submitted'
  | 'filled'
  | 'partial'
  | 'cancelled'
  | 'failed'
  | 'simulated';

export type CloseReason =
  | 'stop_loss'
  | 'take_profit'
  | 'signal_reversed'
  | 'manual'
  | 'kill_switch'
  | 'event_guard'
  | 'loss_limit'
  | 'daily_limit'
  | 'session_ended'
  | 'timeout';

export interface OrderRequest {
  sessionId:    string;
  portfolioId:  string | null;
  symbol:       string;
  direction:    'long' | 'short';
  orderType:    'market' | 'limit' | 'stop_limit';
  qty:          number;
  entryPrice:   number;
  limitPrice:   number | null;
  stopLoss:     number;
  takeProfit:   number;
  riskAmount:   number;
  riskPct:      number;
  strategyName: string;
  signalReason: string;
  confidence:   'low' | 'medium' | 'high';
  tradingMode:  TradingMode;
}

export interface ExecutionOrder {
  id:            string;
  sessionId:     string;
  portfolioId:   string | null;
  symbol:        string;
  direction:     'long' | 'short';
  orderType:     string;
  qty:           number;
  entryPrice:    number | null;
  limitPrice:    number | null;
  stopLoss:      number | null;
  takeProfit:    number | null;
  riskAmount:    number | null;
  riskPct:       number | null;
  strategyName:  string | null;
  signalReason:  string | null;
  confidence:    'low' | 'medium' | 'high' | null;
  tradingMode:   TradingMode;
  status:        OrderStatus;
  brokerOrderId: string | null;
  filledPrice:   number | null;
  filledQty:     number | null;
  commission:    number;
  failureReason: string | null;
  closePrice:    number | null;
  closeReason:   CloseReason | null;
  pnl:           number | null;
  pnlPct:        number | null;
  signalAt:      string;
  submittedAt:   string | null;
  filledAt:      string | null;
  closedAt:      string | null;
  createdAt:     string;
}

/** Build an OrderRequest from a computed shadow signal */
export function buildOrderFromSignal(
  signal: ShadowSignal,
  sessionId: string,
  portfolioId: string | null,
  symbol: string,
  strategyName: string,
  mode: TradingMode,
  allocatedCap: number,
): OrderRequest {
  const riskPct = allocatedCap > 0 ? (signal.riskAmount / allocatedCap) * 100 : 1;
  return {
    sessionId,
    portfolioId,
    symbol,
    direction:    signal.direction,
    orderType:    'market',
    qty:          signal.positionSize,
    entryPrice:   signal.entryApprox,
    limitPrice:   null,
    stopLoss:     signal.stopLoss,
    takeProfit:   signal.takeProfit,
    riskAmount:   signal.riskAmount,
    riskPct,
    strategyName,
    signalReason: signal.reason,
    confidence:   signal.confidence,
    tradingMode:  mode,
  };
}

/** Initial status for a new order based on trading mode */
export function initialOrderStatus(mode: TradingMode): OrderStatus {
  return mode === 'live' ? 'pending' : 'simulated';
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   'Pending',
  submitted: 'Submitted',
  filled:    'Filled',
  partial:   'Partial Fill',
  cancelled: 'Cancelled',
  failed:    'Failed',
  simulated: 'Simulated',
};

export const CLOSE_REASON_LABEL: Record<CloseReason, string> = {
  stop_loss:       'Stop loss hit',
  take_profit:     'Take profit hit',
  signal_reversed: 'Signal reversed',
  manual:          'Manually closed',
  kill_switch:     'Kill switch',
  event_guard:     'Event guard',
  loss_limit:      'Loss limit',
  daily_limit:     'Daily limit',
  session_ended:   'Session ended',
  timeout:         'Timeout',
};

export function isOrderOpen(status: OrderStatus): boolean {
  return status === 'pending' || status === 'submitted' || status === 'partial';
}

export function computeOrderPnL(
  entryPrice: number,
  closePrice: number,
  qty: number,
  direction: 'long' | 'short',
  commission = 0,
): { pnl: number; pnlPct: number } {
  const rawPnl = direction === 'long'
    ? (closePrice - entryPrice) * qty
    : (entryPrice - closePrice) * qty;
  const pnl    = rawPnl - commission;
  const pnlPct = entryPrice > 0
    ? ((closePrice - entryPrice) / entryPrice) * (direction === 'long' ? 1 : -1) * 100
    : 0;
  return { pnl, pnlPct };
}
