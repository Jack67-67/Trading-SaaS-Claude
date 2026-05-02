import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type CardVariant = "default" | "glass" | "elevated";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  variant?: CardVariant;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const variantStyles: Record<CardVariant, string> = {
  default:  "bg-surface-1 border border-border shadow-card",
  glass:    "bg-surface-1/70 backdrop-blur-xl border border-border/60 shadow-card",
  elevated: "bg-surface-2 border border-border shadow-elevated",
};

export function Card({
  className,
  padding = "md",
  variant = "default",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-text-primary", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
