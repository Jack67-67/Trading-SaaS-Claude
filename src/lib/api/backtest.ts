import type { BacktestRunRequest, ApiError } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_BACKTEST_API_URL || "http://localhost:8000";

class BacktestApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "BacktestApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    let detail = "An unexpected error occurred";
    try {
      const err: ApiError = await res.json();
      detail = err.detail;
    } catch {
      detail = res.statusText;
    }
    throw new BacktestApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

/**
 * POST /backtests/run
 *
 * Submits a backtest to the FastAPI engine. The backend processes it
 * and writes status + results directly to Supabase. The frontend
 * reads updates via Supabase realtime subscription.
 */
export async function submitBacktestRun(
  payload: BacktestRunRequest,
  token: string
): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/backtests/run", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function checkApiHealth(): Promise<{
  status: string;
  version: string;
}> {
  return apiFetch("/health");
}

export { BacktestApiError };
