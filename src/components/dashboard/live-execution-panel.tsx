"use client";

import { useState, useTransition } from "react";
import {
  Radio, Zap, ShieldAlert, CheckCircle2, XCircle, RefreshCw,
  AlertTriangle, TrendingUp, TrendingDown, Clock, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isOrderOpen,
  ORDER_STATUS_LABEL,
  type ExecutionOrder,
} from "@/lib/execution-engine";
import type { ShadowSignal } from "@/lib/autotrading-ai";
import {
  executeSessionSignal,
  cancelLiveOrder,
  syncOrderStatus,
  triggerKillSwitch,
} from "@/app/actions/execution";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreCheckItem {
  id:      string;
  label:   string;
  detail:  string;
  passed:  boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LiveExecutionPanel({
  sessionId,
  symbol,
  interval,
  shadowSignal,
  executionOrders,
  sessionPaused,
  sessionStopped,
  allReadinessPassed,
  buyingPower,
  dailyLiveTradeCount,
  maxDailyTrades,
}: {
  sessionId:           string;
  symbol:              string;
  interval:            string;
  shadowSignal:        ShadowSignal | null;
  executionOrders:     ExecutionOrder[];
  sessionPaused:       boolean;
  sessionStopped:      boolean;
  allReadinessPassed:  boolean;
  buyingPower:         number | null;
  dailyLiveTradeCount: number;
  maxDailyTrades:      number;
}) {
  const [pending, startTransition]       = useTransition();
  const [actionMsg, setActionMsg]        = useState<{ ok: boolean; text: string } | null>(null);
  const [syncingId, setSyncingId]        = useState<string | null>(null);
  const [cancellingId, setCancellingId]  = useState<string | null>(null);
  const [killConfirm, setKillConfirm]    = useState(false);

  // Split orders
  const liveOrders   = executionOrders.filter(o => o.tradingMode === "live");
  const openLiveOrders  = liveOrders.filter(o => isOrderOpen(o.status));
  const closedLiveOrders = liveOrders.filter(o => !isOrderOpen(o.status)).slice(0, 20);

  const estimatedCost = shadowSignal
    ? shadowSignal.entryApprox * shadowSignal.positionSize
    : 0;

  // Pre-execution gate checks
  const preChecks: PreCheckItem[] = [
    {
      id:     "readiness",
      label:  "All readiness checks passed",
      detail: allReadinessPassed ? "Broker connected, account active, risk limits OK" : "Complete the readiness checklist above",
      passed: allReadinessPassed,
    },
    {
      id:     "signal",
      label:  "Signal detected",
      detail: shadowSignal
        ? `${shadowSignal.direction === "long" ? "Long" : "Short"} ${symbol} — ${shadowSignal.confidence} confidence`
        : "No signal at this time — strategy conditions not met",
      passed: shadowSignal !== null,
    },
    {
      id:     "no_open",
      label:  "No open position",
      detail: openLiveOrders.length === 0
        ? "No open live orders for this symbol"
        : `${openLiveOrders.length} open order(s) — close before placing a new one`,
      passed: openLiveOrders.length === 0,
    },
    {
      id:     "daily_limit",
      label:  "Daily trade limit",
      detail: dailyLiveTradeCount < maxDailyTrades
        ? `${dailyLiveTradeCount} / ${maxDailyTrades} trades today`
        : `Limit reached: ${dailyLiveTradeCount} / ${maxDailyTrades} trades today`,
      passed: dailyLiveTradeCount < maxDailyTrades,
    },
    {
      id:     "buying_power",
      label:  "Sufficient buying power",
      detail: shadowSignal && buyingPower !== null
        ? buyingPower >= estimatedCost
          ? `$${buyingPower.toLocaleString()} available — order ~$${estimatedCost.toFixed(0)}`
          : `Need ~$${estimatedCost.toFixed(0)} but only $${buyingPower.toFixed(0)} available`
        : buyingPower !== null
          ? `$${buyingPower.toLocaleString()} available`
          : "Buying power unknown — refresh broker",
      passed: shadowSignal !== null
        ? (buyingPower !== null && buyingPower >= estimatedCost)
        : (buyingPower !== null && buyingPower > 0),
    },
  ];

  const allChecksPassed = preChecks.every(c => c.passed);
  const canExecute = allChecksPassed && !pending && !sessionStopped && !sessionPaused;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleExecute() {
    setActionMsg(null);
    startTransition(async () => {
      const res = await executeSessionSignal(sessionId);
      if ("error" in res) {
        setActionMsg({ ok: false, text: res.error });
      } else {
        setActionMsg({
          ok:   true,
          text: `Order submitted · Broker ID: ${res.brokerOrderId.slice(0, 8)}…`,
        });
      }
    });
  }

  function handleSync(orderId: string) {
    setSyncingId(orderId);
    startTransition(async () => {
      const res = await syncOrderStatus(orderId, sessionId);
      setSyncingId(null);
      if (res?.error) setActionMsg({ ok: false, text: res.error });
    });
  }

  function handleCancel(orderId: string) {
    setCancellingId(orderId);
    startTransition(async () => {
      const res = await cancelLiveOrder(orderId, sessionId);
      setCancellingId(null);
      if (res?.error) setActionMsg({ ok: false, text: res.error });
    });
  }

  function handleKillSwitch() {
    if (!killConfirm) { setKillConfirm(true); return; }
    setKillConfirm(false);
    setActionMsg(null);
    startTransition(async () => {
      const res = await triggerKillSwitch(sessionId);
      if ("error" in res) {
        setActionMsg({ ok: false, text: res.error });
      } else {
        setActionMsg({
          ok:   true,
          text: `Kill switch activated — ${res.cancelled} order(s) cancelled, session paused`,
        });
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (sessionStopped || sessionPaused) {
    return (
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-surface-1 flex items-center gap-2">
          <Radio size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Live Execution</p>
          <span className="ml-auto text-2xs font-bold px-2 py-0.5 rounded border text-amber-400/80 bg-amber-400/10 border-amber-400/20">
            {sessionStopped ? "STOPPED" : "PAUSED"}
          </span>
        </div>
        <div className="px-5 py-6 text-center space-y-1.5">
          <AlertTriangle size={20} className="text-amber-400/40 mx-auto" />
          <p className="text-xs text-text-secondary font-semibold">
            {sessionStopped ? "Session stopped" : "Session paused"}
          </p>
          <p className="text-2xs text-text-muted">
            {sessionStopped
              ? "This session has been stopped and cannot execute orders."
              : "Resume or restart the session to enable live execution."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-profit/20 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-profit/15 bg-profit/[0.03] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-profit animate-pulse" />
          <p className="text-xs font-semibold text-profit uppercase tracking-wider">Live Execution</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs font-bold px-2 py-0.5 rounded border text-profit bg-profit/10 border-profit/20">
            LIVE · REAL ORDERS
          </span>
        </div>
      </div>

      {/* ── Pre-execution gate ───────────────────────────────────────────── */}
      <div className="divide-y divide-border/60">
        {preChecks.map(check => (
          <div key={check.id} className="flex items-start gap-3 px-5 py-2.5">
            <span className={cn(
              "shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center",
              check.passed ? "bg-profit/15" : "bg-loss/15",
            )}>
              {check.passed
                ? <CheckCircle2 size={10} className="text-profit" />
                : <XCircle      size={10} className="text-loss" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-xs font-semibold",
                check.passed ? "text-text-primary" : "text-text-secondary",
              )}>
                {check.label}
              </p>
              <p className="text-2xs text-text-muted leading-snug">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Signal summary + execute button ─────────────────────────────── */}
      <div className="px-5 py-4 border-t border-border bg-surface-1 space-y-3">
        {shadowSignal ? (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Signal pill */}
            <div className="flex items-center gap-2 min-w-0">
              {shadowSignal.direction === "long"
                ? <TrendingUp size={14} className="text-profit shrink-0" />
                : <TrendingDown size={14} className="text-loss shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    "text-2xs font-bold px-1.5 py-0.5 rounded border uppercase",
                    shadowSignal.direction === "long"
                      ? "text-profit bg-profit/10 border-profit/20"
                      : "text-loss bg-loss/10 border-loss/20",
                  )}>
                    {shadowSignal.direction === "long" ? "BUY" : "SELL"} {symbol}
                  </span>
                  <span className="text-2xs text-text-muted font-mono">
                    {shadowSignal.positionSize} sh @ ~{fmtPrice(shadowSignal.entryApprox)}
                  </span>
                  <span className="text-2xs text-loss font-mono">SL {fmtPrice(shadowSignal.stopLoss)}</span>
                  <span className="text-2xs text-profit font-mono">TP {fmtPrice(shadowSignal.takeProfit)}</span>
                </div>
                <p className="text-2xs text-text-muted mt-0.5 line-clamp-1">{shadowSignal.reason}</p>
              </div>
            </div>

            {/* Execute button */}
            <button
              type="button"
              disabled={!canExecute}
              onClick={handleExecute}
              className={cn(
                "ml-auto shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                canExecute
                  ? "bg-profit text-surface-0 hover:bg-profit/90 ring-2 ring-profit/20"
                  : "bg-surface-3 text-text-muted cursor-not-allowed opacity-60",
              )}
            >
              {pending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {pending ? "Executing…" : "Execute Trade"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-text-secondary">No signal at this time</p>
              <p className="text-2xs text-text-muted">
                Strategy conditions are not met for {symbol} on {interval}. No order will be placed.
              </p>
            </div>
            <button
              type="button"
              disabled={true}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-surface-3 text-text-muted cursor-not-allowed opacity-60"
            >
              <Zap size={12} />
              Execute Trade
            </button>
          </div>
        )}

        {/* Action feedback */}
        {actionMsg && (
          <div className={cn(
            "flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs border",
            actionMsg.ok
              ? "bg-profit/5 border-profit/20 text-profit"
              : "bg-loss/5 border-loss/20 text-loss",
          )}>
            {actionMsg.ok
              ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
              : <XCircle      size={12} className="shrink-0 mt-0.5" />}
            <span className="leading-snug">{actionMsg.text}</span>
          </div>
        )}
      </div>

      {/* ── Open live orders ─────────────────────────────────────────────── */}
      {openLiveOrders.length > 0 && (
        <div className="border-t border-border">
          <div className="px-5 py-3 bg-surface-0/40 border-b border-border/60">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
              Open Orders ({openLiveOrders.length})
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {openLiveOrders.map(order => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                {/* Direction + symbol */}
                <span className={cn(
                  "text-2xs font-bold px-1.5 py-0.5 rounded border shrink-0",
                  order.direction === "long"
                    ? "text-profit bg-profit/10 border-profit/20"
                    : "text-loss bg-loss/10 border-loss/20",
                )}>
                  {order.direction === "long" ? "LONG" : "SHORT"}
                </span>
                <span className="text-xs font-bold font-mono text-text-primary">{order.symbol}</span>
                <span className="text-2xs text-text-muted font-mono">
                  {order.qty} sh
                </span>

                {/* Status */}
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded border text-accent bg-accent/10 border-accent/20">
                  {ORDER_STATUS_LABEL[order.status]}
                </span>

                {/* Broker ID */}
                {order.brokerOrderId && (
                  <span className="text-2xs text-text-muted/50 font-mono hidden sm:inline">
                    #{order.brokerOrderId.slice(0, 8)}
                  </span>
                )}

                {/* Time */}
                <span className="text-2xs text-text-muted/50 flex items-center gap-1">
                  <Clock size={9} />
                  {timeAgo(order.signalAt)}
                </span>

                {/* Actions */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={pending || syncingId === order.id}
                    onClick={() => handleSync(order.id)}
                    className="text-2xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 disabled:opacity-40"
                  >
                    <RefreshCw size={10} className={cn(syncingId === order.id && "animate-spin")} />
                    Sync
                  </button>
                  <button
                    type="button"
                    disabled={pending || cancellingId === order.id}
                    onClick={() => handleCancel(order.id)}
                    className="text-2xs text-loss/70 hover:text-loss transition-colors flex items-center gap-1 disabled:opacity-40"
                  >
                    <Ban size={10} className={cn(cancellingId === order.id && "animate-spin")} />
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent closed live orders ────────────────────────────────────── */}
      {closedLiveOrders.length > 0 && (
        <div className="border-t border-border">
          <div className="px-5 py-3 bg-surface-0/40 border-b border-border/60">
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
              Recent Closed ({closedLiveOrders.length})
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {closedLiveOrders.slice(0, 5).map(order => {
              const hasPnl = order.pnl != null;
              return (
                <div key={order.id} className="flex items-center gap-3 px-5 py-2.5 flex-wrap">
                  <span className={cn(
                    "text-2xs font-bold px-1.5 py-0.5 rounded border shrink-0",
                    order.direction === "long"
                      ? "text-profit/70 bg-profit/10 border-profit/15"
                      : "text-loss/70 bg-loss/10 border-loss/15",
                  )}>
                    {order.direction === "long" ? "LONG" : "SHORT"}
                  </span>
                  <span className="text-xs font-mono text-text-secondary">{order.symbol}</span>
                  <span className="text-2xs text-text-muted/60 font-mono">{order.qty} sh</span>

                  <span className={cn(
                    "text-2xs font-semibold px-1.5 py-0.5 rounded border",
                    order.status === "filled"    ? "text-profit/80 bg-profit/10 border-profit/15" :
                    order.status === "cancelled" ? "text-text-muted bg-surface-3 border-border"   :
                                                   "text-loss/80   bg-loss/10   border-loss/15",
                  )}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>

                  {hasPnl && (
                    <span className={cn(
                      "text-xs font-bold font-mono ml-auto",
                      order.pnl! >= 0 ? "text-profit" : "text-loss",
                    )}>
                      {order.pnl! >= 0 ? "+" : ""}
                      {order.pnl!.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>
                  )}

                  <span className="text-2xs text-text-muted/40 flex items-center gap-1 shrink-0">
                    <Clock size={9} />
                    {timeAgo(order.signalAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Kill switch ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-border bg-surface-0/40">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <ShieldAlert size={12} className="text-loss/60 shrink-0" />
              <p className="text-xs font-semibold text-text-secondary">Kill Switch</p>
            </div>
            <p className="text-2xs text-text-muted leading-snug">
              Immediately cancels all open orders and pauses this session.
              Use in emergencies — you will need to manually resume.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleKillSwitch}
            onBlur={() => setKillConfirm(false)}
            className={cn(
              "shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              killConfirm
                ? "bg-loss text-white border-loss ring-2 ring-loss/30"
                : "bg-loss/5 text-loss border-loss/30 hover:bg-loss/10",
              pending && "opacity-50 cursor-not-allowed",
            )}
          >
            {pending
              ? <RefreshCw size={12} className="animate-spin" />
              : <ShieldAlert size={12} />}
            {killConfirm ? "Confirm — Stop All" : "Kill Switch"}
          </button>
        </div>
      </div>

    </div>
  );
}
