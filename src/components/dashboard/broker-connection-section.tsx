"use client";

import { useState, useTransition } from "react";
import {
  Link2, Link2Off, RefreshCw, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Wallet, Activity,
  Eye, EyeOff, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  saveBrokerConnection,
  removeBrokerConnection,
  getBrokerLiveData,
  type BrokerConnectionRow,
} from "@/app/actions/broker";
import type { BrokerAccount, BrokerPosition, BrokerType } from "@/lib/broker";

// ── Types ────────────────────────────────────────────────────────────────────

interface LiveData {
  account:   BrokerAccount;
  positions: BrokerPosition[];
  loadedAt:  string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US", {
  style:    "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function fmtPct(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(2)}%`;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const BROKER_OPTIONS: { value: BrokerType; label: string; desc: string }[] = [
  {
    value: "alpaca_paper",
    label: "Alpaca Paper Trading",
    desc:  "Simulated trades — safe for testing",
  },
  {
    value: "alpaca_live",
    label: "Alpaca Live Trading",
    desc:  "Real money — use with caution",
  },
];

const BROKER_BADGE: Record<BrokerType, string> = {
  alpaca_paper: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alpaca_live:  "bg-gain/10 text-gain border-gain/20",
};

// ── Add Connection Form ───────────────────────────────────────────────────────

function AddConnectionForm({
  existingBrokers,
  onAdded,
  onCancel,
}: {
  existingBrokers: BrokerType[];
  onAdded: (row: BrokerConnectionRow, live: LiveData) => void;
  onCancel: () => void;
}) {
  const [broker, setBroker]       = useState<BrokerType>("alpaca_paper");
  const [apiKey, setApiKey]       = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = BROKER_OPTIONS.filter((o) => !existingBrokers.includes(o.value));
  const selected  = BROKER_OPTIONS.find((o) => o.value === broker)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveBrokerConnection(broker, apiKey, apiSecret);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const row: BrokerConnectionRow = {
        id:              res.id,
        broker,
        status:          "connected",
        display_name:    selected.label,
        account_number:  res.data.account.account_number,
        error_message:   null,
        last_verified_at: new Date().toISOString(),
        created_at:      new Date().toISOString(),
      };
      onAdded(row, { account: res.data.account, positions: res.data.positions, loadedAt: new Date().toISOString() });
    });
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-text-muted px-1">
        All supported broker types are already connected.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Broker selector */}
      <div className="space-y-2">
        <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
          Broker
        </label>
        <div className="grid gap-2">
          {available.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBroker(opt.value)}
              className={cn(
                "flex items-start gap-3 w-full rounded-xl border px-4 py-3 text-left transition-colors",
                broker === opt.value
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface-0 hover:border-border-hover",
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                broker === opt.value ? "border-accent" : "border-text-muted",
              )}>
                {broker === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* API credentials */}
      <div className="space-y-3">
        <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
          API Credentials
        </label>
        <input
          type="text"
          placeholder="API Key ID"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className={cn(
            "w-full h-10 px-3 rounded-lg border bg-surface-0 text-sm font-mono text-text-primary",
            "border-border focus:border-accent focus:outline-none transition-colors",
            "placeholder:text-text-muted",
          )}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            placeholder="API Secret Key"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className={cn(
              "w-full h-10 px-3 pr-10 rounded-lg border bg-surface-0 text-sm font-mono text-text-primary",
              "border-border focus:border-accent focus:outline-none transition-colors",
              "placeholder:text-text-muted",
            )}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Credentials are stored securely and only used server-side.
          Use a <strong className="text-text-secondary">read-only key</strong> if your broker supports it.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-loss/10 border border-loss/20 px-3 py-2.5">
          <AlertTriangle size={13} className="text-loss mt-0.5 shrink-0" />
          <p className="text-xs text-loss">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending || !apiKey.trim() || !apiSecret.trim()}
          className={cn(
            "flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium transition-colors",
            "bg-accent text-white hover:bg-accent/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {pending ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : (
            <Link2 size={13} />
          )}
          {pending ? "Connecting…" : "Connect"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={cn(
            "flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors",
            "text-text-secondary hover:text-text-primary hover:bg-surface-3 border border-border",
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Connected Card ────────────────────────────────────────────────────────────

function ConnectedCard({
  conn,
  initialLive,
  onRemoved,
}: {
  conn:        BrokerConnectionRow;
  initialLive: LiveData | null;
  onRemoved:   () => void;
}) {
  const [live, setLive]                 = useState<LiveData | null>(initialLive);
  const [expanded, setExpanded]         = useState(false);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [refreshing, startRefresh]      = useTransition();
  const [removing, startRemove]         = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  function handleRefresh() {
    setLoadError(null);
    startRefresh(async () => {
      const res = await getBrokerLiveData(conn.id);
      if ("error" in res) {
        setLoadError(res.error);
      } else {
        setLive({ account: res.account, positions: res.positions, loadedAt: new Date().toISOString() });
      }
    });
  }

  function handleRemove() {
    startRemove(async () => {
      await removeBrokerConnection(conn.id);
      onRemoved();
    });
  }

  const isError = conn.status === "error";

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      isError ? "border-loss/30" : "border-border",
    )}>

      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-0">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          isError ? "bg-loss/10" : "bg-accent/10",
        )}>
          {isError
            ? <Link2Off size={13} className="text-loss" />
            : <Link2    size={13} className="text-accent" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">{conn.display_name}</p>
            <span className={cn(
              "text-2xs font-semibold px-1.5 py-0.5 rounded border",
              BROKER_BADGE[conn.broker],
            )}>
              {conn.broker === "alpaca_paper" ? "Paper" : "Live"}
            </span>
            <span className={cn(
              "text-2xs font-medium px-1.5 py-0.5 rounded-full",
              isError
                ? "bg-loss/10 text-loss"
                : "bg-gain/10 text-gain",
            )}>
              {isError ? "Error" : "Connected"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {conn.account_number && (
              <p className="text-xs text-text-muted font-mono">
                •••{conn.account_number.slice(-5)}
              </p>
            )}
            {conn.last_verified_at && (
              <p className="text-xs text-text-muted flex items-center gap-1">
                <Clock size={10} />
                {relTime(conn.last_verified_at)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh account data"
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-text-muted",
              "hover:bg-surface-3 hover:text-text-primary transition-colors",
              "disabled:opacity-50",
            )}
          >
            <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            title="Toggle details"
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-text-muted",
              "hover:bg-surface-3 hover:text-text-primary transition-colors",
            )}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Error message */}
      {isError && conn.error_message && (
        <div className="flex items-start gap-2 px-4 py-2 bg-loss/5 border-t border-loss/20">
          <AlertTriangle size={12} className="text-loss mt-0.5 shrink-0" />
          <p className="text-xs text-loss">{conn.error_message}</p>
        </div>
      )}

      {/* Live error */}
      {loadError && (
        <div className="flex items-start gap-2 px-4 py-2 bg-loss/5 border-t border-loss/20">
          <AlertTriangle size={12} className="text-loss mt-0.5 shrink-0" />
          <p className="text-xs text-loss">{loadError}</p>
        </div>
      )}

      {/* Live data summary strip (always shown when loaded) */}
      {live && (
        <div className="grid grid-cols-3 gap-0 border-t border-border divide-x divide-border">
          <DataCell
            icon={Wallet}
            label="Portfolio Value"
            value={fmt.format(live.account.portfolio_value)}
          />
          <DataCell
            icon={TrendingUp}
            label="Buying Power"
            value={fmt.format(live.account.buying_power)}
          />
          <DataCell
            icon={Activity}
            label="Open Positions"
            value={String(live.positions.length)}
            sub={live.positions.length > 0 ? `in ${live.positions.map(p => p.symbol).slice(0, 3).join(", ")}${live.positions.length > 3 ? "…" : ""}` : undefined}
          />
        </div>
      )}

      {/* Refresh prompt when no data loaded yet */}
      {!live && !loadError && conn.status === "connected" && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2">
          <p className="text-xs text-text-muted flex-1">
            Click refresh to load live balance and positions.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={cn(refreshing && "animate-spin")} />
            {refreshing ? "Loading…" : "Load data"}
          </button>
        </div>
      )}

      {/* Expanded: positions + account details */}
      {expanded && live && (
        <div className="border-t border-border bg-surface-0 divide-y divide-border/50">

          {/* Account details */}
          <div className="px-4 py-3 grid grid-cols-3 gap-4">
            <DetailItem label="Cash"         value={fmt.format(live.account.cash)} />
            <DetailItem label="Equity"       value={fmt.format(live.account.equity)} />
            <DetailItem label="Account status" value={live.account.status} />
          </div>

          {/* Positions */}
          {live.positions.length > 0 ? (
            <div>
              <div className="px-4 py-2 bg-surface-1 flex items-center justify-between">
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Open Positions
                </p>
                <p className="text-2xs text-text-muted">
                  {live.positions.length} position{live.positions.length !== 1 ? "s" : ""}
                </p>
              </div>
              {live.positions.map((pos) => (
                <PositionRow key={pos.symbol} pos={pos} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs text-text-muted">No open positions.</p>
            </div>
          )}
        </div>
      )}

      {/* Remove row */}
      <div className="border-t border-border px-4 py-2.5 bg-surface-1 flex items-center justify-between">
        {confirmRemove ? (
          <div className="flex items-center gap-2 w-full">
            <p className="text-xs text-text-secondary flex-1">Remove this connection?</p>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1 text-xs font-medium text-loss hover:text-loss/80 disabled:opacity-50"
            >
              {removing ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
              {removing ? "Removing…" : "Yes, remove"}
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              className="text-xs text-text-muted hover:text-text-secondary ml-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <p className="text-2xs text-text-muted">Read-only — no orders will be placed</p>
            <button
              onClick={() => setConfirmRemove(true)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-loss transition-colors"
            >
              <Trash2 size={11} />
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DataCell({
  icon: Icon, label, value, sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-text-muted" />
        <p className="text-2xs text-text-muted">{label}</p>
      </div>
      <p className="text-sm font-semibold text-text-primary font-mono">{value}</p>
      {sub && <p className="text-2xs text-text-muted truncate">{sub}</p>}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs text-text-muted mb-0.5">{label}</p>
      <p className="text-xs text-text-primary font-medium capitalize">{value}</p>
    </div>
  );
}

function PositionRow({ pos }: { pos: BrokerPosition }) {
  const gain = pos.unrealized_pl >= 0;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-l-2 hover:bg-surface-1 transition-colors"
      style={{ borderLeftColor: gain ? "var(--color-gain)" : "var(--color-loss)" }}
    >
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span className={cn(
          "text-2xs font-bold px-1.5 py-0.5 rounded",
          pos.side === "long" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss",
        )}>
          {pos.side === "long" ? "L" : "S"}
        </span>
        <span className="text-sm font-semibold text-text-primary">{pos.symbol}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted">
          {pos.qty} shares @ avg {fmt.format(pos.avg_entry_price)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono text-text-primary">{fmt.format(pos.market_value)}</p>
        <p className={cn("text-2xs font-mono", gain ? "text-gain" : "text-loss")}>
          {fmtPct(pos.unrealized_plpc)}
        </p>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function BrokerConnectionSection({
  initialConnections,
}: {
  initialConnections: BrokerConnectionRow[];
}) {
  const [connections, setConnections] = useState<BrokerConnectionRow[]>(initialConnections);
  const [liveDataMap, setLiveDataMap]  = useState<Record<string, LiveData>>({});
  const [adding, setAdding]            = useState(false);

  const existingBrokers = connections.map((c) => c.broker);

  function handleAdded(row: BrokerConnectionRow, live: LiveData) {
    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.broker === row.broker);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [...prev, row];
    });
    setLiveDataMap((prev) => ({ ...prev, [row.id]: live }));
    setAdding(false);
  }

  function handleRemoved(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setLiveDataMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const canAddMore = existingBrokers.length < 2 && !adding;

  return (
    <div className="space-y-4">

      {connections.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border px-5 py-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto">
            <Link2 size={18} className="text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">No broker connected</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto leading-relaxed">
              Connect your Alpaca account to see real balance, positions, and account status.
              Shadow mode will use your real account data without placing orders.
            </p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium mx-auto",
              "bg-accent text-white hover:bg-accent/90 transition-colors",
            )}
          >
            <Plus size={13} />
            Connect Broker
          </button>
        </div>
      )}

      {/* Connected cards */}
      <div className="space-y-3">
        {connections.map((conn) => (
          <ConnectedCard
            key={conn.id}
            conn={conn}
            initialLive={liveDataMap[conn.id] ?? null}
            onRemoved={() => handleRemoved(conn.id)}
          />
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.02] px-4 py-4 space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={13} className="text-accent" />
            <p className="text-sm font-semibold text-text-primary">Add broker connection</p>
          </div>
          <AddConnectionForm
            existingBrokers={existingBrokers}
            onAdded={handleAdded}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Add another button */}
      {canAddMore && connections.length > 0 && (
        <button
          onClick={() => setAdding(true)}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium",
            "text-text-secondary border border-border hover:border-border-hover hover:text-text-primary",
            "transition-colors",
          )}
        >
          <Plus size={12} />
          Add another
        </button>
      )}

      <p className="text-xs text-text-muted leading-relaxed pt-1">
        <CheckCircle2 size={11} className="inline mr-1 text-gain" />
        Connections are read-only. No trades or orders will be placed at this stage.
      </p>
    </div>
  );
}
