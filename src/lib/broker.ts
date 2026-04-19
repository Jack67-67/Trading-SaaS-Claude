// ── Broker API wrapper ──────────────────────────────────────────────────────
// Read-only Alpaca integration. No order placement.
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
