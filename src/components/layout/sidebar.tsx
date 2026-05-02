"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Code2,
  FlaskConical,
  BarChart3,
  Sparkles,
  Layers2,
  Activity,
  Bot,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const iconMap = {
  Home,
  LayoutDashboard,
  Code2,
  FlaskConical,
  BarChart3,
  Sparkles,
  Layers2,
  Activity,
  Bot,
} as const;

const navItems = [
  { label: "Home",          href: "/dashboard",             icon: "Home" as const,            badge: null },
  { label: "Overview",      href: "/dashboard/overview",    icon: "LayoutDashboard" as const,  badge: null },
  { label: "Portfolio",     href: "/dashboard/portfolio",   icon: "Layers2" as const,         badge: null },
  { label: "Strategies",    href: "/dashboard/strategies",  icon: "Code2" as const,           badge: null },
  { label: "Backtests",     href: "/dashboard/backtests",   icon: "FlaskConical" as const,    badge: null },
  { label: "Results",       href: "/dashboard/results",     icon: "BarChart3" as const,       badge: null },
  { label: "AI Strategy",   href: "/dashboard/ai-strategy",    icon: "Sparkles" as const,   badge: "New" },
  { label: "Paper Trading", href: "/dashboard/paper-trading",  icon: "Activity" as const,   badge: null  },
  { label: "Autotrading",   href: "/dashboard/autotrading",    icon: "Bot" as const,         badge: "New" },
];

export function Sidebar({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col",
        "bg-surface-0 border-r border-border",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <Logo size="sm" showText={!collapsed} />
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 h-9 rounded-xl text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-accent/10 text-accent shadow-glow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-accent" />
              )}
              <span className="relative shrink-0">
                <Icon className="w-4.5 h-4.5" size={18} />
                {/* Alert dot on Strategies when there are active warnings */}
                {item.href === "/dashboard/strategies" && alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400 ring-1 ring-surface-0" />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none tracking-wide">
                      {item.badge}
                    </span>
                  )}
                  {/* Alert count badge */}
                  {item.href === "/dashboard/strategies" && alertCount > 0 && (
                    <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 leading-none tabular-nums">
                      {alertCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border py-3 px-2 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 h-9 rounded-xl text-sm text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </Link>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 h-9 rounded-xl text-sm text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors w-full",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          {collapsed ? (
            <ChevronsRight size={18} />
          ) : (
            <>
              <ChevronsLeft size={18} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
