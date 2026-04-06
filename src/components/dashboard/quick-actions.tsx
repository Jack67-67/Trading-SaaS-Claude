import Link from "next/link";
import { Plus, Play, BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "AI Strategy",
    description: "No code needed — describe your idea",
    href: "/dashboard/ai-strategy",
    icon: Sparkles,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    featured: true,
  },
  {
    label: "New Strategy",
    description: "Write or paste Python code",
    href: "/dashboard/strategies/new",
    icon: Plus,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-transparent",
    featured: false,
  },
  {
    label: "Run Backtest",
    description: "Test a strategy against historical data",
    href: "/dashboard/backtests",
    icon: Play,
    color: "text-profit",
    bg: "bg-profit/10",
    border: "border-transparent",
    featured: false,
  },
  {
    label: "View Results",
    description: "Browse AI analysis of completed runs",
    href: "/dashboard/results",
    icon: BarChart3,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-transparent",
    featured: false,
  },
];

export function QuickActions() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-surface-1">
        <h2 className="text-sm font-semibold text-text-primary">Quick Actions</h2>
        <p className="text-xs text-text-muted mt-0.5">Jump to common tasks</p>
      </div>

      {/* Actions */}
      <div className="divide-y divide-border bg-surface-0">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "flex items-center gap-3.5 px-5 py-3.5 transition-colors group",
                action.featured
                  ? "bg-gradient-to-r from-accent/[0.06] to-transparent hover:from-accent/[0.1]"
                  : "hover:bg-surface-1"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                action.bg
              )}>
                <Icon size={15} className={action.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold",
                  action.featured ? "text-accent" : "text-text-primary group-hover:text-accent transition-colors"
                )}>
                  {action.label}
                </p>
                <p className="text-xs text-text-muted truncate">{action.description}</p>
              </div>
              <ArrowRight
                size={14}
                className="text-text-muted group-hover:text-text-secondary group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
