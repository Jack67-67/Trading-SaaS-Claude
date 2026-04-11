"use client";

import { useTransition } from "react";
import { Zap } from "lucide-react";
import { tryExampleAction } from "@/app/actions/try-example";
import { cn } from "@/lib/utils";

interface TryExampleButtonProps {
  className?: string;
  size?: "default" | "lg";
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
