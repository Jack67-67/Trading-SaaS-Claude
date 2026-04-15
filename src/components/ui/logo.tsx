import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 28,
  md: 32,
  lg: 40,
};

const textSizeMap = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const px = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt={APP_NAME}
        width={px}
        height={px}
        className="shrink-0 rounded-lg"
        priority
      />
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
