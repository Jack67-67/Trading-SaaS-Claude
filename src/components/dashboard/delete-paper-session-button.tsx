"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deletePaperSession } from "@/app/actions/delete";

export function DeletePaperSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePaperSession(sessionId);
      if (res?.error) {
        setError(res.error);
        setConfirming(false);
      } else {
        router.push("/dashboard/paper-trading");
      }
    });
  }

  if (error) {
    return (
      <p className="text-xs text-loss">
        {error}{" "}
        <button onClick={() => { setError(null); setConfirming(false); }} className="underline">dismiss</button>
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm font-semibold text-loss hover:bg-loss/20 disabled:opacity-50 transition-colors"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {pending ? "Deleting…" : "Confirm Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm text-text-muted hover:text-loss hover:border-loss/40 hover:bg-loss/5 transition-colors"
    >
      <Trash2 size={13} />
      Delete
    </button>
  );
}
