import { Code2, FlaskConical, TrendingUp, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  strategyCount: number;
  backtestCount: number;
}

export function DashboardStats({
  strategyCount,
  backtestCount,
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Strategies",
      value: strategyCount,
      icon: Code2,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Total Backtests",
      value: backtestCount,
      icon: FlaskConical,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
    {
      label: "Best Sharpe",
      value: "—",
      icon: TrendingUp,
      color: "text-profit",
      bg: "bg-profit/10",
      subtext: "No data yet",
    },
    {
      label: "Avg Run Time",
      value: "—",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      subtext: "No data yet",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-text-primary mt-1 font-mono tabular-nums">
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-2xs text-text-muted mt-0.5">
                    {stat.subtext}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  stat.bg
                )}
              >
                <Icon size={18} className={stat.color} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
