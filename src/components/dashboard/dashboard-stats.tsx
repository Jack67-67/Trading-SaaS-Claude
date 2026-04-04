import Link from "next/link";
import { Code2, FlaskConical, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  strategyCount: number;
  backtestCount: number;
  bestSharpe: string | null;
  avgRunTime: string | null;
}

export function DashboardStats({
  strategyCount,
  backtestCount,
  bestSharpe,
  avgRunTime,
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Strategies",
      value: String(strategyCount),
      sub: strategyCount === 0 ? "Create your first strategy" : strategyCount === 1 ? "Strategy defined" : "Strategies defined",
      icon: Code2,
      color: "text-accent",
      bg: "bg-accent/10",
      glow: "shadow-[0_0_60px_-20px_rgba(59,130,246,0.25)]",
      accent: "bg-accent",
      href: "/dashboard/strategies",
    },
    {
      label: "Backtests Run",
      value: String(backtestCount),
      sub: backtestCount === 0 ? "No tests run yet" : backtestCount === 1 ? "Historical test completed" : "Historical tests completed",
      icon: FlaskConical,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      glow: "shadow-[0_0_60px_-20px_rgba(167,139,250,0.2)]",
      accent: "bg-violet-400",
      href: "/dashboard/backtests",
    },
    {
      label: "Top Risk Score",
      value: bestSharpe ?? "—",
      sub: bestSharpe ? "Higher is better" : "Run a backtest to see this",
      icon: TrendingUp,
      color: "text-profit",
      bg: "bg-profit/10",
      glow: bestSharpe ? "shadow-[0_0_60px_-20px_rgba(34,197,94,0.2)]" : "",
      accent: "bg-profit",
      href: "/dashboard/results",
    },
    {
      label: "Analysis Speed",
      value: avgRunTime ?? "—",
      sub: avgRunTime ? "Avg per backtest" : "Run a backtest to see this",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      glow: "",
      accent: "bg-amber-400",
      href: "/dashboard/backtests",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              "group rounded-2xl bg-surface-1 border border-border p-5 relative overflow-hidden",
              "hover:border-border-hover transition-colors",
              stat.glow
            )}
          >
            {/* Colored top-edge accent line */}
            <div className={cn("absolute top-0 left-5 right-5 h-px", stat.accent)} />

            <div className="flex items-start justify-between mb-4">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest">
                {stat.label}
              </p>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
                <Icon size={14} className={stat.color} />
              </div>
            </div>

            <p className="text-4xl font-bold font-mono tabular-nums tracking-tight leading-none text-text-primary">
              {stat.value}
            </p>

            <p className="text-xs text-text-muted mt-2.5 group-hover:text-text-secondary transition-colors">
              {stat.sub}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
