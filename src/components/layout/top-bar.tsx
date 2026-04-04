"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, User, ChevronDown, ChevronRight, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/strategies": "Strategies",
  "/dashboard/backtests": "Backtests",
  "/dashboard/results": "Results",
  "/dashboard/settings": "Settings",
  "/dashboard/ai-strategy": "AI Strategy",
};

function useBreadcrumb(pathname: string): { section: string; detail: string | null } {
  const parts = pathname.split("/").filter(Boolean); // ["dashboard", "strategies", "abc123"]
  const base = "/" + parts.slice(0, 2).join("/");
  const section = SECTION_LABELS[base] ?? "Dashboard";
  const isDetail = parts.length > 2;
  const detailLabel = isDetail
    ? parts[1] === "strategies"
      ? "Edit Strategy"
      : parts[1] === "backtests"
        ? "Run Detail"
        : parts[1] === "results"
          ? "Results Detail"
          : parts[1] === "ai-strategy"
            ? "Strategy Results"
            : null
    : null;
  // "new" sub-route gets a specific label
  const isNew = parts[2] === "new";
  return {
    section,
    detail: isNew ? "New Strategy" : detailLabel,
  };
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { section, detail } = useBreadcrumb(pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const email = user?.email ?? "";
  const initials = email.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-surface-0/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className={cn("font-medium", detail ? "text-text-muted" : "text-text-primary")}>
          {section}
        </span>
        {detail && (
          <>
            <ChevronRight size={14} className="text-text-muted shrink-0" />
            <span className="text-text-primary font-medium">{detail}</span>
          </>
        )}
      </div>

      {/* AI notification bell */}
      <div className="flex items-center gap-2 mr-1">
        <a
          href="/dashboard"
          title="AI Activity"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors"
        >
          <Bell size={16} />
          {/* Pulsing dot — indicates AI monitoring is active */}
          <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-profit" />
          </span>
        </a>
      </div>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-lg transition-colors",
            "hover:bg-surface-2",
            menuOpen && "bg-surface-2"
          )}
        >
          <div className="w-7 h-7 rounded-md bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">
            {initials}
          </div>
          <span className="text-sm text-text-secondary max-w-[160px] truncate hidden sm:block">
            {email}
          </span>
          <ChevronDown
            size={14}
            className={cn("text-text-muted transition-transform", menuOpen && "rotate-180")}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-surface-2 border border-border shadow-xl shadow-black/30 py-1.5 animate-fade-in">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm text-text-primary font-medium truncate">{email}</p>
              <p className="text-xs text-text-muted mt-0.5">Free Plan</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); router.push("/dashboard/settings"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              <User size={15} />
              Account Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-loss hover:bg-loss/10 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
