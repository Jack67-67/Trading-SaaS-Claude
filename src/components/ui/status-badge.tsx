import { cn } from "@/lib/utils";
import type { BacktestStatus } from "@/types";

const statusConfig: Record<
  BacktestStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-yellow-400",
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
  },
  running: {
    label: "Running",
    dot: "bg-accent animate-pulse",
    bg: "bg-accent/10",
    text: "text-accent",
  },
  completed: {
    label: "Completed",
    dot: "bg-profit",
    bg: "bg-profit/10",
    text: "text-profit",
  },
  failed: {
    label: "Failed",
    dot: "bg-loss",
    bg: "bg-loss/10",
    text: "text-loss",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-text-muted",
    bg: "bg-text-muted/10",
    text: "text-text-muted",
  },
};

export function StatusBadge({ status }: { status: BacktestStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
        config.bg,
        config.text
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
