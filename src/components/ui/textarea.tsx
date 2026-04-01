"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted",
            "bg-surface-1 border border-border resize-y min-h-[80px]",
            "transition-colors duration-150",
            "hover:border-border-hover",
            "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-loss focus:border-loss focus:ring-loss/30",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-loss">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
