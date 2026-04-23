"use server";

// ── Live execution server actions ─────────────────────────────────────────────
// All writes to real broker accounts happen here — server-side only.
// Credentials are never sent to the client.

import { createClient }                      from "@/lib/supabase/server";
import { revalidatePath }                    from "next/cache";
import { computeShadowSignal, type AutotradingMetrics } from "@/lib/autotrading-ai";
import { buildOrderFromSignal }              from "@/lib/execution-engine";
import {
  placeBracketOrder,
  cancelBrokerOrder,
  getBrokerOrderStatus,
  type BrokerType,
} from "@/lib/broker";
import { getTodayGuard }                     from "@/lib/economic-calendar";

// ── Types ─────────────────────────────────────────────────────────────────────

type CredRow = {
  broker:                string;
  api_key:               string;
  api_secret:            string;
  status:                string;
  cached_account_status: string | null;
  cached_buying_power:   number | null;
};

type ConnIdRow = { broker_connection_id: string | null };
type BrokerConnRow = { broker: string; api_key: string; api_secret: string };

// ── Helper: fetch broker credentials for a session ───────────────────────────

async function getBrokerCredentials(
  db: ReturnType<typeof createClient>,
  sessionId: string,
  userId: string,
): Promise<BrokerConnRow | { error: string }> {
  const anyDb = db as any;

  const { data: sess } = await anyDb
    .from("paper_trade_sessions")
    .select("broker_connection_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single() as { data: ConnIdRow | null };

  if (!sess?.broker_connection_id) return { error: "No broker linked to session" };

  const { data: conn } = await anyDb
    .from("broker_connections")
    .select("broker, api_key, api_secret")
    .eq("id", sess.broker_connection_id)
    .eq("user_id", userId)
    .single() as { data: BrokerConnRow | null };

  if (!conn) return { error: "Broker connection not found" };
  return conn;
}

// ── Execute a live signal ─────────────────────────────────────────────────────
// Runs all pre-execution safety checks, then places a bracket order at Alpaca.

export async function executeSessionSignal(
  sessionId: string,
): Promise<{ error: string } | { orderId: string; brokerOrderId: string }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const db = supabase as any;

  // ── 1. Load session ───────────────────────────────────────────────────────
  const { data: sess } = await db
    .from("paper_trade_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single() as { data: Record<string, unknown> | null };

  if (!sess)                          return { error: "Session not found" };
  if (sess.trading_mode !== "live")   return { error: "Session is not in Live mode" };
  if (sess.status === "stopped")      return { error: "Session is stopped" };
  if (sess.status === "paused")       return { error: "Session is paused" };

  const symbol         = String(sess.symbol ?? "");
  const interval       = String(sess.interval ?? "");
  const initCap        = Number(sess.initial_capital ?? 100_000);
  const maxCapPct      = Number(sess.max_capital_pct ?? 100);
  const maxDailyTrades = Number(sess.max_daily_trades ?? 10);
  const pauseOnEvents  = Boolean(sess.pause_on_events ?? true);
  const strategyName   = String(sess.name ?? "");
  const brokerConnId   = (sess.broker_connection_id as string | null) ?? null;
  const results        = (sess.last_results as Record<string, unknown> | null) ?? null;

  if (!brokerConnId) return { error: "No broker connected to this session" };

  // ── 2. Event guard ────────────────────────────────────────────────────────
  if (pauseOnEvents) {
    const guard = getTodayGuard();
    if (guard?.level === "danger") {
      const eventName = guard.events?.[0]?.short ?? "high-impact event";
      return { error: `Blocked by event guard: ${eventName} today. Disable event guard to override.` };
    }
  }

  // ── 3. Daily trade count check ────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: todayOrders } = await db
    .from("execution_orders")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("trading_mode", "live")
    .gte("signal_at", todayStr)
    .limit(maxDailyTrades + 1) as { data: { id: string }[] | null };

  if ((todayOrders?.length ?? 0) >= maxDailyTrades) {
    return { error: `Daily trade limit reached (${maxDailyTrades} trades today)` };
  }

  // ── 4. No duplicate open position ─────────────────────────────────────────
  const { data: openOrders } = await db
    .from("execution_orders")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("trading_mode", "live")
    .eq("symbol", symbol)
    .in("status", ["pending", "submitted", "partial"])
    .limit(1) as { data: { id: string }[] | null };

  if ((openOrders?.length ?? 0) > 0) {
    return { error: `Open position already exists for ${symbol}. Close it before placing a new order.` };
  }

  // ── 5. Compute signal ─────────────────────────────────────────────────────
  const metrics       = (results?.metrics as AutotradingMetrics) ?? null;
  const openPos       = (results?.open_positions ?? []) as { current_price: number }[];
  const trades        = (results?.trades ?? []) as { exit_price: number }[];

  if (!metrics) return { error: "No backtest results — run a backtest first" };

  const lastPrice: number | null =
    openPos.length > 0  ? openPos[0].current_price
    : trades.length > 0 ? trades[trades.length - 1].exit_price
    : null;

  if (!lastPrice) return { error: "No price data available — refresh session data first" };

  const signal = computeShadowSignal({
    symbol,
    interval,
    metrics,
    initialCapital: initCap,
    maxCapitalPct:  maxCapPct,
    lastPrice,
  });

  if (!signal) return { error: "No signal at this time — strategy conditions not met" };

  // ── 6. Load broker credentials (server-side only) ─────────────────────────
  const { data: brokerConn } = await db
    .from("broker_connections")
    .select("broker, api_key, api_secret, status, cached_account_status, cached_buying_power")
    .eq("id", brokerConnId)
    .eq("user_id", user.id)
    .single() as { data: CredRow | null };

  if (!brokerConn)                                    return { error: "Broker connection not found" };
  if (brokerConn.status !== "connected")              return { error: "Broker is not connected. Re-verify in Settings." };
  if (brokerConn.cached_account_status !== "ACTIVE")  return { error: "Broker account is not ACTIVE" };

  // ── 7. Buying power check ─────────────────────────────────────────────────
  const estimatedCost = signal.entryApprox * signal.positionSize;
  const buyingPower   = brokerConn.cached_buying_power ?? 0;
  if (buyingPower < estimatedCost) {
    return {
      error: `Insufficient buying power: need ~$${estimatedCost.toFixed(0)}, have $${buyingPower.toFixed(0)}`,
    };
  }

  // ── 8. Place bracket order at broker ─────────────────────────────────────
  const clientOrderId = `sess_${sessionId.slice(0, 8)}_${Date.now()}`;

  const orderResult = await placeBracketOrder(
    brokerConn.broker as BrokerType,
    brokerConn.api_key,
    brokerConn.api_secret,
    {
      symbol,
      qty:           signal.positionSize,
      side:          signal.direction === "long" ? "buy" : "sell",
      stopLoss:      signal.stopLoss,
      takeProfit:    signal.takeProfit,
      clientOrderId,
    },
  );

  if ("error" in orderResult) {
    return { error: `Broker rejected order: ${orderResult.error}` };
  }

  // ── 9. Log order to DB ────────────────────────────────────────────────────
  const req = buildOrderFromSignal(
    signal, sessionId, null, symbol, strategyName, "live",
    initCap * (maxCapPct / 100),
  );
  const now = new Date().toISOString();

  const { data: inserted, error: insertErr } = await db
    .from("execution_orders")
    .insert({
      user_id:         user.id,
      session_id:      req.sessionId,
      portfolio_id:    req.portfolioId,
      symbol:          req.symbol,
      direction:       req.direction,
      order_type:      req.orderType,
      qty:             req.qty,
      entry_price:     req.entryPrice,
      limit_price:     req.limitPrice,
      stop_loss:       req.stopLoss,
      take_profit:     req.takeProfit,
      risk_amount:     req.riskAmount,
      risk_pct:        req.riskPct,
      strategy_name:   req.strategyName,
      signal_reason:   req.signalReason,
      confidence:      req.confidence,
      trading_mode:    "live",
      status:          "submitted",
      broker_order_id: orderResult.id,
      signal_at:       now,
      submitted_at:    now,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (insertErr || !inserted) {
    // Order is live at broker — log it prominently but don't hide the broker ID
    console.error(
      `[execution] CRITICAL: order ${orderResult.id} placed at broker but DB insert failed:`,
      insertErr?.message,
    );
    return {
      error: `Order submitted at broker (ID: ${orderResult.id}) but failed to save locally: ${insertErr?.message ?? "unknown"}. Note this broker order ID.`,
    };
  }

  // ── 10. Update session last_action ────────────────────────────────────────
  await db
    .from("paper_trade_sessions")
    .update({ last_action: "live_order_placed", last_action_at: now })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  revalidatePath(`/dashboard/autotrading/${sessionId}`);
  revalidatePath("/dashboard/autotrading");
  return { orderId: inserted.id, brokerOrderId: orderResult.id };
}

// ── Sync a single order's status from broker ─────────────────────────────────

const ALPACA_STATUS_MAP: Record<string, string> = {
  new:                  "submitted",
  partially_filled:     "partial",
  filled:               "filled",
  done_for_day:         "cancelled",
  canceled:             "cancelled",
  expired:              "cancelled",
  replaced:             "cancelled",
  pending_cancel:       "submitted",
  pending_replace:      "submitted",
  accepted:             "submitted",
  pending_new:          "pending",
  accepted_for_bidding: "pending",
  stopped:              "filled",
  rejected:             "failed",
  suspended:            "failed",
  calculated:           "filled",
};

export async function syncOrderStatus(
  orderId: string,
  sessionId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const db = supabase as any;

  const { data: order } = await db
    .from("execution_orders")
    .select("id, broker_order_id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; broker_order_id: string | null; status: string } | null };

  if (!order)                 return { error: "Order not found" };
  if (!order.broker_order_id) return { error: "No broker order ID — cannot sync" };
  // Already in a terminal state
  if (["filled", "cancelled", "failed", "simulated"].includes(order.status)) return undefined;

  const conn = await getBrokerCredentials(supabase, sessionId, user.id);
  if ("error" in conn) return conn;

  const result = await getBrokerOrderStatus(
    conn.broker as BrokerType,
    conn.api_key,
    conn.api_secret,
    order.broker_order_id,
  );

  if ("error" in result) return { error: result.error };

  const newStatus = ALPACA_STATUS_MAP[result.status] ?? "submitted";
  const updates: Record<string, unknown> = {
    status:     newStatus,
    updated_at: new Date().toISOString(),
  };

  if ((newStatus === "filled" || newStatus === "partial") && result.filled_avg_price !== null) {
    updates.filled_price = result.filled_avg_price;
    updates.filled_qty   = result.filled_qty;
    updates.filled_at    = result.filled_at ?? new Date().toISOString();
  }

  if (newStatus === "failed") {
    updates.failure_reason = `Broker status: ${result.status}`;
  }

  await db
    .from("execution_orders")
    .update(updates)
    .eq("id", orderId)
    .eq("user_id", user.id);

  revalidatePath(`/dashboard/autotrading/${sessionId}`);
  return undefined;
}

// ── Cancel a live order ───────────────────────────────────────────────────────

export async function cancelLiveOrder(
  orderId: string,
  sessionId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const db = supabase as any;

  const { data: order } = await db
    .from("execution_orders")
    .select("id, broker_order_id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; broker_order_id: string | null; status: string } | null };

  if (!order) return { error: "Order not found" };
  if (!["pending", "submitted", "partial"].includes(order.status)) {
    return { error: "Order is not open" };
  }
  if (!order.broker_order_id) return { error: "No broker order ID — cannot cancel" };

  const conn = await getBrokerCredentials(supabase, sessionId, user.id);
  if ("error" in conn) return conn;

  const cancelErr = await cancelBrokerOrder(
    conn.broker as BrokerType,
    conn.api_key,
    conn.api_secret,
    order.broker_order_id,
  );

  // 422 = already filled/cancelled at broker — still update our DB
  if (cancelErr && !cancelErr.error.includes("422") && !cancelErr.error.toLowerCase().includes("already")) {
    return { error: cancelErr.error };
  }

  const now = new Date().toISOString();
  await db
    .from("execution_orders")
    .update({
      status:       "cancelled",
      close_reason: "manual",
      closed_at:    now,
      updated_at:   now,
    })
    .eq("id", orderId)
    .eq("user_id", user.id);

  revalidatePath(`/dashboard/autotrading/${sessionId}`);
  return undefined;
}

// ── Kill switch — cancel all open live orders and pause session ───────────────

export async function triggerKillSwitch(
  sessionId: string,
): Promise<{ error: string } | { cancelled: number }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const db = supabase as any;

  // Get open live orders
  const { data: openOrders } = await db
    .from("execution_orders")
    .select("id, broker_order_id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("trading_mode", "live")
    .in("status", ["pending", "submitted", "partial"]) as {
      data: { id: string; broker_order_id: string | null }[] | null
    };

  const now = new Date().toISOString();
  let cancelled = 0;

  if (openOrders && openOrders.length > 0) {
    const conn = await getBrokerCredentials(supabase, sessionId, user.id);

    for (const ord of openOrders) {
      if (!("error" in conn) && ord.broker_order_id) {
        await cancelBrokerOrder(
          conn.broker as BrokerType,
          conn.api_key,
          conn.api_secret,
          ord.broker_order_id,
        );
      }
      await db
        .from("execution_orders")
        .update({
          status:       "cancelled",
          close_reason: "kill_switch",
          closed_at:    now,
          updated_at:   now,
        })
        .eq("id", ord.id)
        .eq("user_id", user.id);
      cancelled++;
    }
  }

  // Pause session regardless of whether any orders were open
  await db
    .from("paper_trade_sessions")
    .update({
      status:         "paused",
      pause_reason:   "kill_switch",
      last_action:    "kill_switch",
      last_action_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  revalidatePath(`/dashboard/autotrading/${sessionId}`);
  revalidatePath("/dashboard/autotrading");
  return { cancelled };
}
