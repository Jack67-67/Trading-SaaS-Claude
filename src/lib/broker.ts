// ── Broker API wrapper ──────────────────────────────────────────────────────
// Alpaca integration — read + write (order placement).
// Called server-side only (server actions / route handlers).

export type BrokerType = "alpaca_paper" | "alpaca_live";

export const BROKER_LABELS: Record<BrokerType, string> = {
  alpaca_paper: "Alpaca Paper",
  alpaca_live:  "Alpaca Live",
};

export interface BrokerAccount {
  account_number: string;
  status:         string;
  equity:         number;
  buying_power:   number;
  cash:           number;
  portfolio_value: number;
  daytrade_count: number;
  currency:       string;
}

export interface BrokerPosition {
  symbol:           string;
  qty:              number;
  side:             "long" | "short";
  avg_entry_price:  number;
  current_price:    number;
  market_value:     number;
  unrealized_pl:    number;
  unrealized_plpc:  number;
  change_today:     number;
}

export interface BrokerConnectionData {
  account:   BrokerAccount;
  positions: BrokerPosition[];
}

export interface BrokerError {
  error: string;
}

const ALPACA_BASE: Record<BrokerType, string> = {
  alpaca_paper: "https://paper-api.alpaca.markets",
  alpaca_live:  "https://api.alpaca.markets",
};

async function alpacaFetch<T>(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
  path: string,
): Promise<T> {
  const res = await fetch(`${ALPACA_BASE[broker]}${path}`, {
    headers: {
      "APCA-API-KEY-ID":     apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.message || body.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.json();
}

async function alpacaWrite<T>(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
  method: "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${ALPACA_BASE[broker]}${path}`, {
    method,
    headers: {
      "APCA-API-KEY-ID":     apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
      "Content-Type":        "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const b = await res.json();
      msg = b.message || b.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export async function fetchBrokerData(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
): Promise<BrokerConnectionData | BrokerError> {
  try {
    const [rawAccount, rawPositions] = await Promise.all([
      alpacaFetch<Record<string, unknown>>(broker, apiKey, apiSecret, "/v2/account"),
      alpacaFetch<Record<string, unknown>[]>(broker, apiKey, apiSecret, "/v2/positions"),
    ]);

    const account: BrokerAccount = {
      account_number:  String(rawAccount.account_number  ?? ""),
      status:          String(rawAccount.status           ?? ""),
      equity:          Number(rawAccount.equity           ?? 0),
      buying_power:    Number(rawAccount.buying_power     ?? 0),
      cash:            Number(rawAccount.cash             ?? 0),
      portfolio_value: Number(rawAccount.portfolio_value  ?? 0),
      daytrade_count:  Number(rawAccount.daytrade_count   ?? 0),
      currency:        String(rawAccount.currency         ?? "USD"),
    };

    const positions: BrokerPosition[] = rawPositions.map((p) => ({
      symbol:          String(p.symbol          ?? ""),
      qty:             Number(p.qty             ?? 0),
      side:            (String(p.side           ?? "long")) as "long" | "short",
      avg_entry_price: Number(p.avg_entry_price ?? 0),
      current_price:   Number(p.current_price   ?? 0),
      market_value:    Number(p.market_value    ?? 0),
      unrealized_pl:   Number(p.unrealized_pl   ?? 0),
      unrealized_plpc: Number(p.unrealized_plpc ?? 0),
      change_today:    Number(p.change_today    ?? 0),
    }));

    return { account, positions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection failed" };
  }
}

// ── Order types ───────────────────────────────────────────────────────────────

export interface BrokerOrderResult {
  id:               string;
  client_order_id:  string;
  status:           string;
  symbol:           string;
  qty:              number;
  filled_qty:       number;
  filled_avg_price: number | null;
  side:             string;
  type:             string;
  submitted_at:     string;
  filled_at:        string | null;
}

function parseOrderResult(raw: Record<string, unknown>): BrokerOrderResult {
  return {
    id:               String(raw.id ?? ""),
    client_order_id:  String(raw.client_order_id ?? ""),
    status:           String(raw.status ?? ""),
    symbol:           String(raw.symbol ?? ""),
    qty:              Number(raw.qty ?? 0),
    filled_qty:       Number(raw.filled_qty ?? 0),
    filled_avg_price: raw.filled_avg_price != null ? Number(raw.filled_avg_price) : null,
    side:             String(raw.side ?? ""),
    type:             String(raw.type ?? ""),
    submitted_at:     String(raw.submitted_at ?? new Date().toISOString()),
    filled_at:        raw.filled_at ? String(raw.filled_at) : null,
  };
}

// ── Place bracket order ───────────────────────────────────────────────────────
// Market entry + GTC stop-loss + GTC take-profit (bracket).

export async function placeBracketOrder(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
  params: {
    symbol:         string;
    qty:            number;
    side:           "buy" | "sell";
    stopLoss:       number;
    takeProfit:     number;
    clientOrderId?: string;
  },
): Promise<BrokerOrderResult | BrokerError> {
  try {
    const raw = await alpacaWrite<Record<string, unknown>>(
      broker, apiKey, apiSecret, "POST", "/v2/orders",
      {
        symbol:        params.symbol,
        qty:           String(params.qty),
        side:          params.side,
        type:          "market",
        time_in_force: "day",
        order_class:   "bracket",
        stop_loss:     { stop_price:  params.stopLoss.toFixed(2) },
        take_profit:   { limit_price: params.takeProfit.toFixed(2) },
        ...(params.clientOrderId ? { client_order_id: params.clientOrderId } : {}),
      },
    );
    return parseOrderResult(raw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Order placement failed" };
  }
}

// ── Cancel an order ───────────────────────────────────────────────────────────

export async function cancelBrokerOrder(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
  orderId: string,
): Promise<BrokerError | undefined> {
  try {
    await alpacaWrite<void>(broker, apiKey, apiSecret, "DELETE", `/v2/orders/${orderId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Cancel failed" };
  }
}

// ── Fetch order status ────────────────────────────────────────────────────────

export async function getBrokerOrderStatus(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
  orderId: string,
): Promise<BrokerOrderResult | BrokerError> {
  try {
    const raw = await alpacaFetch<Record<string, unknown>>(
      broker, apiKey, apiSecret, `/v2/orders/${orderId}`,
    );
    return parseOrderResult(raw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Status fetch failed" };
  }
}
