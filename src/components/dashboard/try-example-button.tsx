"use client";

import { useTransition } from "react";
import { Zap } from "lucide-react";
import { tryExampleAction } from "@/app/actions/try-example";
import { cn } from "@/lib/utils";

interface TryExampleButtonProps {
  className?: string;
  size?: "default" | "lg" | "card";
}

export function TryExampleButton({ className, size = "default" }: TryExampleButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await tryExampleAction();
      // On success, redirect() in the action handles navigation.
      // On error, the action returns { error } but redirect never fires —
      // the user stays on the page. Nothing to handle client-side beyond loading state.
    });
  };

  if (size === "card") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "group rounded-2xl border border-border bg-surface-1",
          "flex flex-col items-center justify-center text-center gap-3 p-6",
          "hover:border-border-hover hover:bg-surface-2/50 transition-all duration-150",
          "w-full disabled:opacity-60 disabled:cursor-not-allowed",
          className
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center group-hover:bg-surface-3/80 transition-colors">
          <Zap size={22} className={cn("text-text-secondary group-hover:text-accent transition-colors", isPending && "animate-pulse")} />
        </div>
        <div>
          <p className="text-base font-bold text-text-primary group-hover:text-accent transition-colors">
            {isPending ? "Setting up…" : "Try example strategy"}
          </p>
          <p className="text-xs text-text-muted mt-1">See a result in 30 seconds</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all",
        "bg-accent text-white hover:bg-accent-hover active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        size === "lg"
          ? "px-6 py-3.5 text-base"
          : "px-5 py-2.5 text-sm",
        className
      )}
    >
      <Zap size={size === "lg" ? 17 : 15} className={cn("shrink-0", isPending && "animate-pulse")} />
      {isPending ? "Setting up your demo…" : "Try example strategy"}
    </button>
  );
}
