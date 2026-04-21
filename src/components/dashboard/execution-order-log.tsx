"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  CLOSE_REASON_LABEL,
  isOrderOpen,
  type ExecutionOrder,
} from "@/lib/execution-engine";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmt$(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtPrice(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending:   "text-accent bg-accent/10 border-accent/20",
  submitted: "text-accent bg-accent/10 border-accent/20",
  filled:    "text-profit bg-profit/10 border-profit/20",
  partial:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
  cancelled: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  failed:    "text-loss bg-loss/10 border-loss/20",
  simulated: "text-text-muted/70 bg-surface-3 border-border",
};

const MODE_STYLE: Record<string, string> = {
  paper:     "text-text-muted/60 bg-surface-3 border-border",
  shadow:    "text-accent bg-accent/10 border-accent/20",
  live_prep: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  live:      "text-profit bg-profit/10 border-profit/20",
};

const MODE_LABEL: Record<string, string> = {
  paper:     "Paper",
  shadow:    "Shadow",
  live_prep: "Live Prep",
  live:      "LIVE",
};

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = "all" | "open" | "closed";

export function ExecutionOrderLog({
  orders,
  showSessionColumn = false,
}: {
  orders:              ExecutionOrder[];
  showSessionColumn?:  boolean;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = orders.filter(o => {
    if (tab === "open")   return isOrderOpen(o.status);
    if (tab === "closed") return !isOrderOpen(o.status);
    return true;
  });

  const openCount   = orders.filter(o => isOrderOpen(o.status)).length;
  const closedCount = orders.filter(o => !isOrderOpen(o.status)).length;

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex items-center gap-1">
        {(["all", "open", "closed"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize",
              tab === t
                ? "bg-surface-3 text-text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-2",
            )}
          >
            {t}
            {t === "open"   && openCount   > 0 && <span className="ml-1.5 text-2xs font-bold text-accent">{openCount}</span>}
            {t === "closed" && closedCount > 0 && <span className="ml-1.5 text-2xs text-text-muted/60">{closedCount}</span>}
          </button>
        ))}
        <span className="ml-auto text-2xs text-text-muted/50">{filtered.length} entries</span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
          <FileText size={28} className="text-text-muted/20" />
          <p className="text-xs text-text-muted">No signals logged yet</p>
          <p className="text-2xs text-text-muted/50">
            Signals appear here as the strategy generates them in shadow or live mode.
          </p>
        </div>
      )}

      {/* Order rows */}
      {filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map(order => (
            <OrderRow key={order.id} order={order} showSession={showSessionColumn} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, showSession }: { order: ExecutionOrder; showSession: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasPnl = order.pnl != null;
  const pnlPos = hasPnl && order.pnl! > 0;
  const pnlNeg = hasPnl && order.pnl! < 0;

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors cursor-pointer",
        expanded ? "border-border-hover bg-surface-1" : "border-border bg-surface-0 hover:bg-surface-1",
      )}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
        {/* Direction */}
        <span className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-bold border",
          order.direction === "long"
            ? "text-profit bg-profit/10 border-profit/20"
            : "text-loss bg-loss/10 border-loss/20",
        )}>
          {order.direction === "long"
            ? <ArrowUpRight size={10} />
            : <ArrowDownRight size={10} />}
          {order.direction.toUpperCase()}
        </span>

        {/* Symbol */}
        <span className="text-xs font-bold text-text-primary font-mono">{order.symbol}</span>

        {/* Mode badge */}
        <span className={cn(
          "text-2xs font-semibold px-1.5 py-0.5 rounded border",
          MODE_STYLE[order.tradingMode] ?? MODE_STYLE.paper,
        )}>
          {MODE_LABEL[order.tradingMode] ?? order.tradingMode}
        </span>

        {/* Status badge */}
        <span className={cn(
          "text-2xs font-semibold px-1.5 py-0.5 rounded border",
          STATUS_STYLE[order.status] ?? STATUS_STYLE.simulated,
        )}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>

        {/* Strategy name */}
        {order.strategyName && (
          <span className="text-2xs text-text-muted truncate max-w-[120px]">{order.strategyName}</span>
        )}

        {/* Confidence */}
        {order.confidence && (
          <span className={cn(
            "text-2xs font-semibold ml-auto",
            order.confidence === "high"   ? "text-profit" :
            order.confidence === "medium" ? "text-amber-400" : "text-text-muted/60",
          )}>
            {order.confidence}
          </span>
        )}

        {/* P&L */}
        {hasPnl && (
          <span className={cn(
            "text-xs font-bold font-mono ml-auto",
            pnlPos ? "text-profit" : pnlNeg ? "text-loss" : "text-text-muted",
          )}>
            {order.pnl! >= 0 ? "+" : ""}{fmt$(order.pnl!)}
          </span>
        )}

        {/* Time */}
        <span className="text-2xs text-text-muted/50 flex items-center gap-1 shrink-0">
          <Clock size={9} />
          {timeAgo(order.signalAt)}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/60 pt-2.5 space-y-2">
          {/* Signal reason */}
          {order.signalReason && (
            <p className="text-xs text-text-muted leading-relaxed">
              <span className="font-semibold text-text-secondary">Signal: </span>
              {order.signalReason}
            </p>
          )}

          {/* Price grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <PriceCell label="Entry"    value={fmtPrice(order.entryPrice ?? order.filledPrice)} />
            <PriceCell label="Stop Loss" value={fmtPrice(order.stopLoss)} accent="loss" />
            <PriceCell label="Take Profit" value={fmtPrice(order.takeProfit)} accent="profit" />
            <PriceCell label="Qty"      value={order.qty.toLocaleString()} />
            {order.riskAmount != null && (
              <PriceCell label="Risk $"  value={fmt$(order.riskAmount)} />
            )}
            {order.riskPct != null && (
              <PriceCell label="Risk %" value={`${order.riskPct.toFixed(2)}%`} />
            )}
          </div>

          {/* Close info */}
          {order.closeReason && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-2xs text-text-muted/60">Closed:</span>
              <span className="text-2xs font-semibold text-text-secondary">
                {CLOSE_REASON_LABEL[order.closeReason]}
              </span>
              {order.closePrice != null && (
                <span className="text-2xs text-text-muted/60">@ {fmtPrice(order.closePrice)}</span>
              )}
              {order.pnlPct != null && (
                <span className={cn(
                  "text-2xs font-mono font-semibold ml-auto",
                  order.pnlPct >= 0 ? "text-profit" : "text-loss",
                )}>
                  {order.pnlPct >= 0 ? "+" : ""}{order.pnlPct.toFixed(2)}%
                </span>
              )}
            </div>
          )}

          {/* Failure reason */}
          {order.failureReason && (
            <p className="text-xs text-loss/80">{order.failureReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

function PriceCell({
  label, value, accent,
}: {
  label: string; value: string; accent?: "profit" | "loss";
}) {
  return (
    <div>
      <p className="text-2xs text-text-muted/60 uppercase tracking-wider">{label}</p>
      <p className={cn(
        "text-xs font-mono font-semibold mt-0.5",
        accent === "profit" ? "text-profit" :
        accent === "loss"   ? "text-loss"   : "text-text-primary",
      )}>
        {value}
      </p>
    </div>
  );
}
