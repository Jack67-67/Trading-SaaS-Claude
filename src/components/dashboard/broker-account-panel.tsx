"use client";

import { useState, useTransition } from "react";
import {
  Link2, Link2Off, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Wallet, TrendingUp, DollarSign,
  ShieldCheck, Activity, ExternalLink, Unlink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrokerLiveData, type BrokerConnectionRow } from "@/app/actions/broker";
import { linkBrokerToSession } from "@/app/actions/live-trading";
import type { BrokerAccount, BrokerPosition } from "@/lib/broker";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedBroker {
  id:                    string;
  broker:                string;
  status:                string;
  display_name:          string | null;
  account_number:        string | null;
  cached_account_status: string | null;
  cached_buying_power:   number | null;
  cached_equity:         number | null;
  last_verified_at:      string | null;
}

interface AvailableBroker {
  id:           string;
  display_name: string | null;
  broker:       string;
  status:       string;
}

interface BrokerAccountPanelProps {
  sessionId:          string;
  linkedBroker:       LinkedBroker | null;
  userBrokers:        AvailableBroker[];
  strategyAllocation: number;   // $ allocated to this strategy
  strategyPct:        number;   // % of initial capital
  initialCapital:     number;
}

interface LiveData {
  account:   BrokerAccount;
  positions: BrokerPosition[];
  loadedAt:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const fmt2 = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function capitalFitLabel(pct: number): { label: string; color: string; icon: "ok" | "warn" | "err" } {
  if (pct < 10) return { label: "Fits comfortably",       color: "text-profit", icon: "ok"   };
  if (pct < 40) return { label: "Moderate allocation",    color: "text-accent",  icon: "ok"   };
  if (pct < 80) return { label: "High allocation",        color: "text-amber-400", icon: "warn" };
  return         { label: "Exceeds buying power",         color: "text-loss",    icon: "err"  };
}

const BROKER_BADGE: Record<string, string> = {
  alpaca_paper: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alpaca_live:  "bg-profit/10 text-profit border-profit/20",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCell({ label, value, sub, valueClass }: {
  label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-2xs text-text-muted mb-0.5">{label}</p>
      <p className={cn("text-sm font-bold font-mono tabular-nums", valueClass ?? "text-text-primary")}>{value}</p>
      {sub && <p className="text-2xs text-text-muted/70 mt-0.5">{sub}</p>}
    </div>
  );
}

function PositionRow({ pos }: { pos: BrokerPosition }) {
  const gain = pos.unrealized_pl >= 0;
  const plPct = (pos.unrealized_plpc * 100).toFixed(2);
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-2.5 border-l-2",
      gain ? "border-profit/60" : "border-loss/60",
    )}>
      <div className="flex items-center gap-1.5 w-20 shrink-0">
        <span className={cn(
          "text-2xs font-bold px-1.5 py-0.5 rounded",
          pos.side === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss",
        )}>
          {pos.side === "long" ? "LONG" : "SHORT"}
        </span>
      </div>
      <span className="text-sm font-semibold text-text-primary w-16 shrink-0">{pos.symbol}</span>
      <span className="text-xs text-text-muted flex-1 min-w-0 truncate">
        {pos.qty} sh @ {fmt2.format(pos.avg_entry_price)}
      </span>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono text-text-primary">{fmt.format(pos.market_value)}</p>
        <p className={cn("text-2xs font-mono", gain ? "text-profit" : "text-loss")}>
          {gain ? "+" : ""}{plPct}%
        </p>
      </div>
    </div>
  );
}

// ── No broker linked: link selector ──────────────────────────────────────────

function LinkBrokerSection({
  sessionId,
  userBrokers,
  onLinked,
}: {
  sessionId:   string;
  userBrokers: AvailableBroker[];
  onLinked:    (brokerId: string) => void;
}) {
  const [selected, setSelected]    = useState<string | null>(null);
  const [error, setError]          = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connectedBrokers = userBrokers.filter(b => b.status === "connected");

  function handleLink() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await linkBrokerToSession(sessionId, selected);
      if (res?.error) {
        setError(res.error);
      } else {
        onLinked(selected);
      }
    });
  }

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
          <Link2 size={14} className="text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Link a broker account</p>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            Linking a broker shows your real balance and buying power alongside the strategy.
            No orders will be placed — this is read-only.
          </p>
        </div>
      </div>

      {connectedBrokers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-4 text-center space-y-2">
          <p className="text-xs text-text-muted">No broker connections found.</p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
          >
            Connect a broker in Settings
            <ExternalLink size={10} />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {connectedBrokers.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelected(b.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                selected === b.id
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface-0 hover:border-border-hover hover:bg-surface-1",
              )}
            >
              <div className={cn(
                "w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                selected === b.id ? "border-accent" : "border-text-muted",
              )}>
                {selected === b.id && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {b.display_name ?? b.broker}
                  </span>
                  <span className={cn(
                    "text-2xs font-semibold px-1.5 py-0.5 rounded border",
                    BROKER_BADGE[b.broker] ?? "bg-surface-3 text-text-muted border-border",
                  )}>
                    {b.broker === "alpaca_paper" ? "Paper" : "Live"}
                  </span>
                </div>
              </div>
              <span className="flex items-center gap-1 text-2xs text-profit shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-profit" />
                Connected
              </span>
            </button>
          ))}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-loss/10 border border-loss/20 px-3 py-2">
              <AlertTriangle size={12} className="text-loss mt-0.5 shrink-0" />
              <p className="text-xs text-loss">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleLink}
              disabled={!selected || pending}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-all",
                selected && !pending
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "bg-surface-3 border border-border text-text-muted cursor-not-allowed opacity-50",
              )}
            >
              {pending
                ? <><RefreshCw size={11} className="animate-spin" /> Linking…</>
                : <><Link2 size={11} /> Link to session</>}
            </button>
            <Link
              href="/dashboard/settings"
              className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
            >
              Add new broker
              <ExternalLink size={9} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Capital comparison ────────────────────────────────────────────────────────

function CapitalComparison({
  strategyAllocation,
  strategyPct,
  buyingPower,
  equity,
}: {
  strategyAllocation: number;
  strategyPct:        number;
  buyingPower:        number | null;
  equity:             number | null;
}) {
  if (buyingPower === null) return null;

  const allocationPct = buyingPower > 0 ? (strategyAllocation / buyingPower) * 100 : 100;
  const fit = capitalFitLabel(allocationPct);
  const barWidth = Math.min(allocationPct, 100);

  return (
    <div className="px-5 py-4 border-t border-border/60 bg-surface-0/40">
      <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Capital Comparison
      </p>
      <div className="space-y-3">

        {/* Strategy vs broker bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-secondary">Strategy allocation</span>
            <span className="text-xs font-mono font-semibold text-text-primary">{fmt.format(strategyAllocation)}</span>
          </div>
          <div className="relative h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                allocationPct < 40 ? "bg-profit"
                : allocationPct < 80 ? "bg-amber-400"
                : "bg-loss",
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xs text-text-muted">
              {allocationPct.toFixed(1)}% of buying power
            </span>
            <span className="text-2xs text-text-muted">
              {fmt.format(buyingPower)} available
            </span>
          </div>
        </div>

        {/* Fit status */}
        <div className={cn(
          "flex items-center gap-2 text-xs font-medium",
          fit.color,
        )}>
          {fit.icon === "ok"
            ? <CheckCircle2 size={12} />
            : fit.icon === "warn"
            ? <AlertTriangle size={12} />
            : <AlertTriangle size={12} />}
          {fit.label}
          {equity !== null && (
            <span className="text-text-muted font-normal ml-auto">
              Account equity: {fmt.format(equity)}
            </span>
          )}
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="bg-surface-1 rounded-lg border border-border px-3 py-2">
            <p className="text-2xs text-text-muted mb-0.5">Allocated</p>
            <p className="text-xs font-bold font-mono text-text-primary">{fmt.format(strategyAllocation)}</p>
            <p className="text-2xs text-text-muted/60">{strategyPct}% of strategy cap</p>
          </div>
          <div className="bg-surface-1 rounded-lg border border-border px-3 py-2">
            <p className="text-2xs text-text-muted mb-0.5">Remaining</p>
            <p className={cn("text-xs font-bold font-mono", buyingPower - strategyAllocation < 0 ? "text-loss" : "text-text-primary")}>
              {fmt.format(Math.max(0, buyingPower - strategyAllocation))}
            </p>
            <p className="text-2xs text-text-muted/60">after strategy</p>
          </div>
          <div className="bg-surface-1 rounded-lg border border-border px-3 py-2">
            <p className="text-2xs text-text-muted mb-0.5">Total BP</p>
            <p className="text-xs font-bold font-mono text-text-primary">{fmt.format(buyingPower)}</p>
            <p className="text-2xs text-text-muted/60">buying power</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BrokerAccountPanel({
  sessionId,
  linkedBroker,
  userBrokers,
  strategyAllocation,
  strategyPct,
  initialCapital,
}: BrokerAccountPanelProps) {
  const [broker, setBroker]        = useState<LinkedBroker | null>(linkedBroker);
  const [live, setLive]            = useState<LiveData | null>(null);
  const [expanded, setExpanded]    = useState(false);
  const [error, setError]          = useState<string | null>(null);
  const [unlinking, startUnlink]   = useTransition();
  const [refreshing, startRefresh] = useTransition();

  // When user links a broker, we'll need to refresh the page to get full broker data.
  // For now, just reload to get the server component to re-fetch.
  function handleLinked(_brokerId: string) {
    window.location.reload();
  }

  function handleRefresh() {
    if (!broker) return;
    setError(null);
    startRefresh(async () => {
      const res = await getBrokerLiveData(broker.id);
      if ("error" in res) {
        setError(res.error);
      } else {
        setLive({ account: res.account, positions: res.positions, loadedAt: new Date().toISOString() });
        // Update cached values locally
        setBroker(prev => prev ? {
          ...prev,
          cached_buying_power: res.account.buying_power,
          cached_equity: res.account.equity,
          cached_account_status: res.account.status,
          last_verified_at: new Date().toISOString(),
          status: "connected",
        } : prev);
      }
    });
  }

  function handleUnlink() {
    startUnlink(async () => {
      await linkBrokerToSession(sessionId, null);
      setBroker(null);
      setLive(null);
    });
  }

  const isError = broker?.status === "error";
  const buyingPower = live?.account.buying_power ?? broker?.cached_buying_power ?? null;
  const equity      = live?.account.equity       ?? broker?.cached_equity       ?? null;
  const accountStatus = live?.account.status     ?? broker?.cached_account_status ?? null;

  // ── No broker linked ───────────────────────────────────────────────────────
  if (!broker) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Link2Off size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Broker Account</p>
          <span className="ml-auto text-2xs text-text-muted/60 bg-surface-3 border border-border rounded px-1.5 py-0.5">
            Not linked
          </span>
        </div>
        <LinkBrokerSection
          sessionId={sessionId}
          userBrokers={userBrokers}
          onLinked={handleLinked}
        />
      </div>
    );
  }

  // ── Broker linked ──────────────────────────────────────────────────────────
  const positions = live?.positions ?? [];

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isError ? "border-loss/30" : "border-border",
    )}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-inherit bg-surface-1 flex items-center gap-3">
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
          isError ? "bg-loss/10" : "bg-profit/10",
        )}>
          {isError
            ? <Link2Off size={11} className="text-loss" />
            : <Link2    size={11} className="text-profit" />}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">
            {broker.display_name ?? "Broker"}
          </p>
          <span className={cn(
            "text-2xs font-semibold px-1.5 py-0.5 rounded border shrink-0",
            BROKER_BADGE[broker.broker] ?? "bg-surface-3 text-text-muted border-border",
          )}>
            {broker.broker === "alpaca_paper" ? "Paper" : "Live"}
          </span>
          {accountStatus && (
            <span className={cn(
              "text-2xs font-semibold px-1.5 py-0.5 rounded-full shrink-0",
              accountStatus === "ACTIVE" ? "bg-profit/10 text-profit" : "bg-amber-400/10 text-amber-400",
            )}>
              {accountStatus}
            </span>
          )}
        </div>

        {/* Read-only badge */}
        <span className="flex items-center gap-1 text-2xs text-text-muted/60 bg-surface-3 border border-border rounded px-2 py-0.5 shrink-0">
          <ShieldCheck size={9} />
          Read-only
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {broker.last_verified_at && (
            <span className="text-2xs text-text-muted/50 hidden sm:block mr-1">
              {relTime(broker.last_verified_at)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh account data"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-3 hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(refreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            title="Toggle positions"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-3 hover:text-text-primary transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {(isError || error) && (
        <div className="flex items-start gap-2 px-5 py-2.5 bg-loss/[0.03] border-b border-loss/20">
          <AlertTriangle size={12} className="text-loss mt-0.5 shrink-0" />
          <p className="text-xs text-loss">{error ?? broker.error_message ?? "Connection error"}</p>
        </div>
      )}

      {/* ── Account metrics ─────────────────────────────────────────────────── */}
      {live ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/60 border-b border-border/60">
          <MetricCell
            label="Portfolio Value"
            value={fmt.format(live.account.portfolio_value)}
            sub={`Cash: ${fmt.format(live.account.cash)}`}
          />
          <MetricCell
            label="Buying Power"
            value={fmt.format(live.account.buying_power)}
          />
          <MetricCell
            label="Open Positions"
            value={String(live.positions.length)}
            sub={live.positions.length > 0
              ? live.positions.slice(0, 2).map(p => p.symbol).join(", ") + (live.positions.length > 2 ? "…" : "")
              : "None"}
          />
          <MetricCell
            label="Account Status"
            value={live.account.status}
            valueClass={live.account.status === "ACTIVE" ? "text-profit text-sm" : "text-amber-400 text-sm"}
          />
        </div>
      ) : (
        /* Cached data strip */
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-border/60 border-b border-border/60">
          <MetricCell
            label="Equity (cached)"
            value={equity !== null ? fmt.format(equity) : "—"}
            sub={broker.last_verified_at ? `Updated ${relTime(broker.last_verified_at)}` : "Not synced"}
            valueClass="text-text-secondary"
          />
          <MetricCell
            label="Buying Power (cached)"
            value={buyingPower !== null ? fmt.format(buyingPower) : "—"}
            sub="Tap refresh to update"
            valueClass="text-text-secondary"
          />
          <div className="hidden sm:flex px-4 py-3 items-center justify-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={cn(refreshing && "animate-spin")} />
              {refreshing ? "Loading…" : "Load live data"}
            </button>
          </div>
        </div>
      )}

      {/* ── Capital comparison ──────────────────────────────────────────────── */}
      <CapitalComparison
        strategyAllocation={strategyAllocation}
        strategyPct={strategyPct}
        buyingPower={buyingPower}
        equity={equity}
      />

      {/* ── Expanded: open positions ─────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border/60">
          <div className="px-5 py-2.5 border-b border-border/40 bg-surface-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={11} className="text-text-muted" />
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                {live ? "Live Positions" : "Positions"}
              </p>
            </div>
            {live && (
              <p className="text-2xs text-text-muted">
                {positions.length} open · as of {relTime(live.loadedAt)}
              </p>
            )}
            {!live && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw size={10} className={cn(refreshing && "animate-spin")} />
                Load positions
              </button>
            )}
          </div>
          {positions.length > 0 ? (
            <div className="divide-y divide-border/40 bg-surface-0">
              {positions.map(p => <PositionRow key={p.symbol} pos={p} />)}
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="text-xs text-text-muted">
                {live ? "No open positions in this account." : "Refresh to load positions."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Account number + unlink ──────────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-border/60 bg-surface-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {broker.account_number && (
            <span className="text-2xs font-mono text-text-muted/60">
              •••{broker.account_number.slice(-5)}
            </span>
          )}
          <span className="flex items-center gap-1 text-2xs text-text-muted/60">
            <ShieldCheck size={9} className="text-profit/60" />
            No orders will be placed — read-only connection
          </span>
        </div>
        <button
          onClick={handleUnlink}
          disabled={unlinking}
          className="flex items-center gap-1 text-2xs text-text-muted/50 hover:text-loss transition-colors disabled:opacity-50"
        >
          <Unlink size={10} />
          {unlinking ? "Unlinking…" : "Unlink"}
        </button>
      </div>

    </div>
  );
}
