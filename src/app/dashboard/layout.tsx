import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
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

    // Take only the latest run per strategy, then check thresholds
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

  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        <Sidebar alertCount={alertCount} />

        <div className="flex-1 ml-60 flex flex-col min-h-screen transition-[margin] duration-200">
          <TopBar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
