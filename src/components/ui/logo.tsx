import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

const textSizeMap = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Geometric logo mark — two overlapping bars forming a stylized Q */}
      <div className={cn("relative shrink-0", sizeMap[size])}>
        <div className="absolute inset-0 rounded-lg bg-accent rotate-6" />
        <div className="absolute inset-0 rounded-lg bg-accent/60 -rotate-6" />
        <div className="absolute inset-[3px] rounded-md bg-surface-0 flex items-center justify-center">
          <span className="text-accent font-mono font-bold text-xs leading-none">
            Q
          </span>
        </div>
      </div>
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-text-primary",
            textSizeMap[size]
          )}
        >
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
