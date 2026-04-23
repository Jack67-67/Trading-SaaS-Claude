import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar, type LiveInfo } from "@/components/layout/top-bar";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Lightweight alert count: check latest completed run per strategy for critical/warning conditions
  let alertCount = 0;
  if (user) {
    const { data: recentRuns } = await supabase
      .from("backtest_runs")
      .select("results, strategy_id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(30);

    const latestByStrategy = new Map<string, Record<string, number>>();
    for (const run of (recentRuns ?? [])) {
      if (!latestByStrategy.has(run.strategy_id as string)) {
        const m = (run.results as Record<string, unknown> | null)?.metrics as Record<string, number> | undefined;
        if (m) latestByStrategy.set(run.strategy_id as string, m);
      }
    }
    for (const m of latestByStrategy.values()) {
      const drawdown = Math.abs(m.max_drawdown_pct ?? 0);
      const sharpe = m.sharpe_ratio ?? 1;
      if (drawdown > 25 || sharpe < 0.3) alertCount++;
    }
  }

  // Live trading status for topbar indicator
  let liveInfo: LiveInfo | null = null;
  if (user) {
    try {
      const db = supabase as any;
      const { data: liveSessions } = await db
        .from("paper_trade_sessions")
        .select("id, name, symbol, trading_mode, status, last_results, initial_capital")
        .eq("user_id", user.id)
        .eq("trading_mode", "live")
        .eq("status", "active")
        .order("last_action_at", { ascending: false })
        .limit(5) as { data: Record<string, unknown>[] | null };

      if (liveSessions && liveSessions.length > 0) {
        const first = liveSessions[0];
        const equityCurve = ((first.last_results as any)?.equity_curve ?? []) as { equity: number }[];
        const initCap     = Number(first.initial_capital ?? 100_000);
        const lastEquity  = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : null;
        const pnl         = lastEquity !== null ? lastEquity - initCap : null;
        const pnlPct      = pnl !== null && initCap > 0 ? (pnl / initCap) * 100 : null;

        liveInfo = {
          count:   liveSessions.length,
          id:      String(first.id ?? ""),
          name:    String(first.name ?? ""),
          symbol:  String(first.symbol ?? ""),
          pnl,
          pnlPct,
        };
      }
    } catch { /* pre-migration: paper_trade_sessions may not have trading_mode yet */ }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        <Sidebar alertCount={alertCount} />

        <div className="flex-1 ml-60 flex flex-col min-h-screen transition-[margin] duration-200">
          <TopBar liveInfo={liveInfo} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
