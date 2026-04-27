import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 28,
  lg: 36,
};

const textSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const px = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/branding/zlugo-logo.png"
        alt={APP_NAME}
        width={px}
        height={px}
        className="shrink-0"
        priority
      />
      {showText && (
        <span
          className={cn(
            "font-bold tracking-widest text-text-primary uppercase",
            textSizeMap[size]
          )}
        >
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
