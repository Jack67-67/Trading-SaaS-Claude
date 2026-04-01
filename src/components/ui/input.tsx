"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 px-3 rounded-lg text-sm text-text-primary placeholder:text-text-muted",
            "bg-surface-1 border border-border",
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
        {hint && !error && (
          <p className="text-xs text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
