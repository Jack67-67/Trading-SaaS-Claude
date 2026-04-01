import Link from "next/link";
import { Plus, Play, BookOpen } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "New Strategy",
    description: "Write a Python trading strategy",
    href: "/dashboard/strategies?new=1",
    icon: Plus,
    color: "text-accent",
    bg: "bg-accent/10 hover:bg-accent/15",
  },
  {
    label: "Run Backtest",
    description: "Test against historical data",
    href: "/dashboard/backtests?new=1",
    icon: Play,
    color: "text-profit",
    bg: "bg-profit/10 hover:bg-profit/15",
  },
  {
    label: "Documentation",
    description: "Strategy API reference",
    href: "https://docs.example.com",
    icon: BookOpen,
    color: "text-amber-400",
    bg: "bg-amber-400/10 hover:bg-amber-400/15",
    external: true,
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const Wrapper = action.external ? "a" : Link;
          const extraProps = action.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {};

          return (
            <Wrapper
              key={action.label}
              href={action.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                action.bg
              )}
              {...(extraProps as Record<string, string>)}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  action.color
                )}
              >
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {action.label}
                </p>
                <p className="text-2xs text-text-muted">{action.description}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </Card>
  );
}
