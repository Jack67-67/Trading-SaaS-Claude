"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-surface-0/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left — breadcrumb area (extensible) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
          Dashboard
        </span>
      </div>

      {/* Right — user menu */}
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
            className={cn(
              "text-text-muted transition-transform",
              menuOpen && "rotate-180"
            )}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-surface-2 border border-border shadow-xl shadow-black/30 py-1.5 animate-fade-in">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm text-text-primary font-medium truncate">
                {email}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Free Plan</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                router.push("/dashboard/settings");
              }}
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
