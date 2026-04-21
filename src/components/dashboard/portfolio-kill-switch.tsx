"use client";

import { useState, useTransition } from "react";
import { ShieldX, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { portfolioKillSwitch } from "@/app/actions/portfolio";

export function PortfolioKillSwitch({
  portfolioId,
  portfolioStatus,
  sessionCount,
}: {
  portfolioId:     string;
  portfolioStatus: string;
  sessionCount:    number;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (portfolioStatus === "stopped") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-loss/40 bg-loss/[0.05]">
        <ShieldX size={13} className="text-loss" />
        <span className="text-xs font-bold text-loss uppercase tracking-wide">Portfolio Stopped</span>
      </div>
    );
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await portfolioKillSwitch(portfolioId);
      if ("error" in res) {
        setError(res.error);
        setConfirm(false);
      }
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-loss/40 bg-loss/[0.05] px-4 py-2.5 flex-wrap">
        <AlertTriangle size={13} className="text-loss shrink-0" />
        <span className="text-xs text-loss font-medium">
          Stop <strong>all {sessionCount} strategies</strong>? This cannot be undone.
        </span>
        <button
          disabled={pending}
          onClick={handleConfirm}
          className="rounded-lg bg-loss px-3 py-1.5 text-xs font-bold text-white hover:bg-loss/80 transition-colors disabled:opacity-50 shrink-0"
        >
          {pending ? "Stopping…" : "Confirm Emergency Stop"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
        {error && <p className="text-xs text-loss w-full mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => setConfirm(true)}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-loss/25 px-4 py-2",
        "text-xs font-bold text-loss/60 hover:text-loss hover:border-loss/50 hover:bg-loss/[0.06]",
        "transition-all disabled:opacity-50",
      )}
    >
      <ShieldX size={13} />
      Emergency Stop — Kill All Strategies
    </button>
  );
}
