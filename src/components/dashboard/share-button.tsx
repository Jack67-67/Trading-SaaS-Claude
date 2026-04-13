"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  text: string;
  className?: string;
}

export function ShareButton({ text, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without user gesture
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        copied
          ? "bg-profit/10 text-profit border border-profit/20"
          : "bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary",
        className
      )}
    >
      {copied
        ? <><Check size={12} className="shrink-0" />Copied!</>
        : <><Share2 size={12} className="shrink-0" />Share result</>}
    </button>
  );
}
