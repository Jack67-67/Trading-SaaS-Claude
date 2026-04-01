"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Code2,
  FlaskConical,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const iconMap = {
  LayoutDashboard,
  Code2,
  FlaskConical,
  BarChart3,
} as const;

const navItems = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" as const },
  {
    label: "Strategies",
    href: "/dashboard/strategies",
    icon: "Code2" as const,
  },
  {
    label: "Backtests",
    href: "/dashboard/backtests",
    icon: "FlaskConical" as const,
  },
  { label: "Results", href: "/dashboard/results", icon: "BarChart3" as const },
];

export function Sidebar() {
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
                "flex items-center gap-3 h-9 rounded-lg text-sm font-medium transition-colors duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border py-3 px-2 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 h-9 rounded-lg text-sm text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <a
          href="https://docs.example.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 h-9 rounded-lg text-sm text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <HelpCircle size={18} />
          {!collapsed && <span>Docs</span>}
        </a>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 h-9 rounded-lg text-sm text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors w-full",
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
