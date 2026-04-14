"use client";

import { useTransition, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  onDelete: () => Promise<{ error: string } | undefined>;
}

export function DeleteButton({ onDelete }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleIconClick(e: React.MouseEvent) {
    stop(e);
    setConfirming(true);
  }

  function handleCancel(e: React.MouseEvent) {
    stop(e);
    setConfirming(false);
    setError(null);
  }

  function handleConfirm(e: React.MouseEvent) {
    stop(e);
    startTransition(async () => {
      const res = await onDelete();
      if (res?.error) {
        setError(res.error);
        setConfirming(false);
      }
    });
  }

  if (error) {
    return (
      <span onClick={stop} className="flex items-center gap-1.5 text-2xs text-loss">
        {error.slice(0, 40)}
        <button onClick={handleCancel} className="underline shrink-0">dismiss</button>
      </span>
    );
  }

  if (confirming) {
    return (
      <span onClick={stop} className="flex items-center gap-1.5">
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="text-2xs font-semibold text-loss px-1.5 py-0.5 rounded bg-loss/10 hover:bg-loss/20 transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 size={10} className="animate-spin inline" /> : "Delete"}
        </button>
        <button onClick={handleCancel} className="text-2xs text-text-muted hover:text-text-secondary transition-colors">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={handleIconClick}
      title="Delete"
      className="p-1.5 rounded text-text-muted/30 hover:text-loss/70 hover:bg-loss/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
    >
      <Trash2 size={13} />
    </button>
  );
}
