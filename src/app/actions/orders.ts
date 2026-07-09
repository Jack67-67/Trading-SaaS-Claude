"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables } from "@/types/supabase";
import {
  computeOrderPnL,
  initialOrderStatus,
  type OrderRequest,
  type ExecutionOrder,
  type CloseReason,
} from "@/lib/execution-engine";

type ExecOrderRow = Tables<"execution_orders">;

function rowToOrder(row: ExecOrderRow): ExecutionOrder {
  return {
    id:            row.id,
    sessionId:     row.session_id,
    portfolioId:   row.portfolio_id,
    symbol:        row.symbol,
    direction:     row.direction as "long" | "short",
    orderType:     row.order_type,
    qty:           row.qty,
    entryPrice:    row.entry_price,
    limitPrice:    row.limit_price,
    stopLoss:      row.stop_loss,
    takeProfit:    row.take_profit,
    riskAmount:    row.risk_amount,
    riskPct:       row.risk_pct,
    strategyName:  row.strategy_name,
    signalReason:  row.signal_reason,
    confidence:    row.confidence as "low" | "medium" | "high" | null,
    tradingMode:   row.trading_mode as ExecutionOrder["tradingMode"],
    status:        row.status as ExecutionOrder["status"],
    brokerOrderId: row.broker_order_id,
    filledPrice:   row.filled_price,
    filledQty:     row.filled_qty,
    commission:    row.commission,
    failureReason: row.failure_reason,
    closePrice:    row.close_price,
    closeReason:   row.close_reason as CloseReason | null,
    pnl:           row.pnl,
    pnlPct:        row.pnl_pct,
    signalAt:      row.signal_at,
    submittedAt:   row.submitted_at,
    filledAt:      row.filled_at,
    closedAt:      row.closed_at,
    createdAt:     row.created_at,
  };
}

/** Log a new order from a signal */
export async function createOrder(
  req: OrderRequest,
): Promise<{ error: string } | { id: string }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const now    = new Date().toISOString();
  const status = initialOrderStatus(req.tradingMode);

  const { data, error } = await supabase
    .from("execution_orders")
    .insert({
      user_id:       user.id,
      session_id:    req.sessionId,
      portfolio_id:  req.portfolioId,
      symbol:        req.symbol,
      direction:     req.direction,
      order_type:    req.orderType,
      qty:           req.qty,
      entry_price:   req.entryPrice,
      limit_price:   req.limitPrice,
      stop_loss:     req.stopLoss,
      take_profit:   req.takeProfit,
      risk_amount:   req.riskAmount,
      risk_pct:      req.riskPct,
      strategy_name: req.strategyName,
      signal_reason: req.signalReason,
      confidence:    req.confidence,
      trading_mode:  req.tradingMode,
      status,
      signal_at:     now,
      // paper/shadow/live_prep signals are instantly "filled" at entry price for audit
      ...(req.tradingMode !== "live" ? {
        filled_price: req.entryPrice,
        filled_qty:   req.qty,
        filled_at:    now,
      } : {}),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create order" };
  revalidatePath(`/dashboard/autotrading/${req.sessionId}`);
  revalidatePath("/dashboard/autotrading/portfolio");
  return { id: data.id };
}

/** Close an order with a price + reason, computes final P&L */
export async function closeOrder(
  orderId: string,
  closePrice: number,
  reason: CloseReason,
  sessionId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { data: order } = await supabase
    .from("execution_orders")
    .select("entry_price, filled_price, qty, direction")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return { error: "Order not found" };

  const entryPx = order.filled_price ?? order.entry_price;
  if (entryPx === null) return { error: "Order has no entry price" };

  const { pnl, pnlPct } = computeOrderPnL(
    entryPx, closePrice, order.qty, order.direction as "long" | "short",
  );

  const { error } = await supabase
    .from("execution_orders")
    .update({
      close_price:  closePrice,
      close_reason: reason,
      pnl,
      pnl_pct:      pnlPct,
      status:       "simulated",
      closed_at:    new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/autotrading/${sessionId}`);
  revalidatePath("/dashboard/autotrading/portfolio");
}

/** Fetch orders for a single session */
export async function getSessionOrders(
  sessionId: string,
  limit = 50,
): Promise<{ error: string } | ExecutionOrder[]> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("execution_orders")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };
  return (data ?? []).map(rowToOrder);
}

/** Fetch all orders across a portfolio */
export async function getPortfolioOrders(
  portfolioId: string,
  limit = 100,
): Promise<{ error: string } | ExecutionOrder[]> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("execution_orders")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };
  return (data ?? []).map(rowToOrder);
}

/** Fetch ALL user orders (fallback when no portfolio_id set yet) */
export async function getAllUserOrders(
  limit = 100,
): Promise<{ error: string } | ExecutionOrder[]> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("execution_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };
  return (data ?? []).map(rowToOrder);
}
