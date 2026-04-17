"use client";

import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  text: string;
  /** When provided, also shows a "Copy link" button for the share URL */
  shareUrl?: string;
  className?: string;
}

export function ShareButton({ text, shareUrl, className }: ShareButtonProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copy = async (value: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  if (shareUrl) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {/* Copy link button */}
        <button
          onClick={() => copy(shareUrl, setCopiedLink)}
          title="Copy shareable link"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            copiedLink
              ? "bg-profit/10 text-profit border border-profit/20"
              : "bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary"
          )}
        >
          {copiedLink
            ? <><Check size={12} className="shrink-0" />Link copied</>
            : <><Link2 size={12} className="shrink-0" />Copy link</>}
        </button>

        {/* Copy summary text button */}
        <button
          onClick={() => copy(text, setCopiedText)}
          title="Copy result summary as text"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            copiedText
              ? "bg-profit/10 text-profit border border-profit/20"
              : "bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary"
          )}
        >
          {copiedText
            ? <><Check size={12} className="shrink-0" />Copied!</>
            : <><Share2 size={12} className="shrink-0" />Share</>}
        </button>
      </div>
    );
  }

  // Fallback: single button (original behavior)
  return (
    <button
      onClick={() => copy(text, setCopiedText)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        copiedText
          ? "bg-profit/10 text-profit border border-profit/20"
          : "bg-surface-2 text-text-secondary border border-border hover:bg-surface-3 hover:text-text-primary",
        className
      )}
    >
      {copiedText
        ? <><Check size={12} className="shrink-0" />Copied!</>
        : <><Share2 size={12} className="shrink-0" />Share result</>}
    </button>
  );
}
