"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { rerunBacktestAction } from "@/app/actions/rerun-backtest";

export function RerunButton({ runId }: { runId: string }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRerun = () => {
    startTransition(async () => {
      const result = await rerunBacktestAction(runId);
      if (result?.error) toast("error", result.error);
    });
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleRerun} loading={isPending}>
      <RotateCcw size={14} />
      {isPending ? "Starting…" : "Re-run"}
    </Button>
  );
}
