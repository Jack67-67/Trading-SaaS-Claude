"use client";

import { useTransition, useState } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPaperTradingSession } from "@/app/actions/paper-trading";
import { cn } from "@/lib/utils";

export function RefreshPaperSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await refreshPaperTradingSession(sessionId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors",
          pending
            ? "text-text-muted bg-surface-1 cursor-not-allowed"
            : "text-accent bg-accent/10 hover:bg-accent/20 border-accent/30"
        )}
      >
        <RefreshCw size={13} className={cn(pending && "animate-spin")} />
        {pending ? "Checking…" : "Check Now"}
      </button>
      {error && (
        <p className="text-2xs text-loss">{error}</p>
      )}
    </div>
  );
}
