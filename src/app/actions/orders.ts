"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  computeOrderPnL,
  initialOrderStatus,
  type OrderRequest,
  type ExecutionOrder,
  type CloseReason,
} from "@/lib/execution-engine";

function rowToOrder(row: Record<string, unknown>): ExecutionOrder {
  return {
    id:            String(row.id),
    sessionId:     String(row.session_id),
    portfolioId:   row.portfolio_id ? String(row.portfolio_id) : null,
    symbol:        String(row.symbol),
    direction:     row.direction as "long" | "short",
    orderType:     String(row.order_type),
    qty:           Number(row.qty),
    entryPrice:    row.entry_price   != null ? Number(row.entry_price)   : null,
    limitPrice:    row.limit_price   != null ? Number(row.limit_price)   : null,
    stopLoss:      row.stop_loss     != null ? Number(row.stop_loss)     : null,
    takeProfit:    row.take_profit   != null ? Number(row.take_profit)   : null,
    riskAmount:    row.risk_amount   != null ? Number(row.risk_amount)   : null,
    riskPct:       row.risk_pct      != null ? Number(row.risk_pct)      : null,
    strategyName:  row.strategy_name ? String(row.strategy_name) : null,
    signalReason:  row.signal_reason ? String(row.signal_reason) : null,
    confidence:    row.confidence as "low" | "medium" | "high" | null,
    tradingMode:   row.trading_mode as ExecutionOrder["tradingMode"],
    status:        row.status as ExecutionOrder["status"],
    brokerOrderId: row.broker_order_id ? String(row.broker_order_id) : null,
    filledPrice:   row.filled_price  != null ? Number(row.filled_price)  : null,
    filledQty:     row.filled_qty    != null ? Number(row.filled_qty)    : null,
    commission:    Number(row.commission ?? 0),
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    closePrice:    row.close_price   != null ? Number(row.close_price)   : null,
    closeReason:   (row.close_reason ?? null) as CloseReason | null,
    pnl:           row.pnl     != null ? Number(row.pnl)     : null,
    pnlPct:        row.pnl_pct != null ? Number(row.pnl_pct) : null,
    signalAt:      String(row.signal_at),
    submittedAt:   row.submitted_at ? String(row.submitted_at) : null,
    filledAt:      row.filled_at    ? String(row.filled_at)    : null,
    closedAt:      row.closed_at    ? String(row.closed_at)    : null,
    createdAt:     String(row.created_at),
  };
}

/** Log a new order from a signal */
export async function createOrder(
  req: OrderRequest,
): Promise<{ error: string } | { id: string }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const db    = supabase as any;
  const now   = new Date().toISOString();
  const status = initialOrderStatus(req.tradingMode);

  const { data, error } = await db
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
    .single() as { data: { id: string } | null; error: { message: string } | null };

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

  const db = supabase as any;

  const { data: order } = await db
    .from("execution_orders")
    .select("entry_price, filled_price, qty, direction")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single() as {
      data: { entry_price: number; filled_price: number | null; qty: number; direction: string } | null
    };

  if (!order) return { error: "Order not found" };

  const entryPx = order.filled_price ?? order.entry_price;
  const { pnl, pnlPct } = computeOrderPnL(
    entryPx, closePrice, order.qty, order.direction as "long" | "short",
  );

  const { error } = await db
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
    .eq("user_id", user.id) as { error: { message: string } | null };

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

  const db = supabase as any;
  const { data, error } = await db
    .from("execution_orders")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit) as {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    };

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

  const db = supabase as any;
  const { data, error } = await db
    .from("execution_orders")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit) as {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    };

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

  const db = supabase as any;
  const { data, error } = await db
    .from("execution_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit) as {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    };

  if (error) return { error: error.message };
  return (data ?? []).map(rowToOrder);
}
