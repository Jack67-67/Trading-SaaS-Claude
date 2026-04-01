import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentBacktests } from "@/components/dashboard/recent-backtests";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user's strategy count
  const { count: strategyCount } = await supabase
    .from("strategies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  // Fetch user's backtest count
  const { count: backtestCount } = await supabase
    .from("backtest_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  // Fetch recent backtest runs
  const { data: recentRuns } = await supabase
    .from("backtest_runs")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Trader";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Welcome back, {displayName}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&apos;s an overview of your backtesting activity.
        </p>
      </div>

      {/* KPI Cards */}
      <DashboardStats
        strategyCount={strategyCount ?? 0}
        backtestCount={backtestCount ?? 0}
      />

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent backtests — 2 cols */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <CardHeader className="px-5 pt-5">
              <CardTitle>Recent Backtests</CardTitle>
            </CardHeader>
            <RecentBacktests runs={recentRuns ?? []} />
          </Card>
        </div>

        {/* Quick actions — 1 col */}
        <QuickActions />
      </div>
    </div>
  );
}
