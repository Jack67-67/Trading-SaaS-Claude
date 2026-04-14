"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createPaperTradingSession } from "@/app/actions/paper-trading";
import { Loader2 } from "lucide-react";

interface Props {
  strategies: { id: string; name: string }[];
}

export function NewPaperSessionForm({ strategies }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Default start = 1 year ago
  const defaultStart = new Date();
  defaultStart.setFullYear(defaultStart.getFullYear() - 1);
  const defaultStartStr = defaultStart.toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createPaperTradingSession({
          strategyId:     fd.get("strategyId") as string,
          name:           fd.get("name") as string,
          symbol:         fd.get("symbol") as string,
          interval:       fd.get("interval") as string,
          startDate:      fd.get("startDate") as string,
          params:         {},
          risk:           {},
          commissionPct:  parseFloat(fd.get("commissionPct") as string) || 0,
          slippagePct:    parseFloat(fd.get("slippagePct") as string) || 0,
          initialCapital: parseFloat(fd.get("initialCapital") as string) || 100000,
        });
        if ("error" in res) {
          setError(res.error);
        } else {
          router.push(`/dashboard/paper-trading/${res.sessionId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      }
    });
  }

  const fieldClass = "w-full rounded-xl bg-surface-1 border border-border px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors";
  const labelClass = "block text-xs font-semibold text-text-secondary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Session name */}
      <div>
        <label htmlFor="name" className={labelClass}>Session Name</label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. AAPL Momentum — Paper"
          className={fieldClass}
          disabled={pending}
        />
      </div>

      {/* Strategy */}
      <div>
        <label htmlFor="strategyId" className={labelClass}>Strategy</label>
        <select id="strategyId" name="strategyId" required className={fieldClass} disabled={pending}>
          <option value="">Select a strategy…</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Symbol + Interval */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="symbol" className={labelClass}>Symbol</label>
          <input
            id="symbol"
            name="symbol"
            required
            placeholder="AAPL"
            className={fieldClass}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="interval" className={labelClass}>Interval</label>
          <select id="interval" name="interval" className={fieldClass} disabled={pending} defaultValue="1d">
            <option value="1d">Daily (1d)</option>
            <option value="1h">Hourly (1h)</option>
            <option value="4h">4-Hour (4h)</option>
          </select>
        </div>
      </div>

      {/* Start date */}
      <div>
        <label htmlFor="startDate" className={labelClass}>Simulation Start Date</label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          required
          defaultValue={defaultStartStr}
          max={new Date().toISOString().slice(0, 10)}
          className={fieldClass}
          disabled={pending}
        />
        <p className="text-2xs text-text-muted mt-1.5">
          The simulation runs from this date to <strong>today</strong>. Longer periods give more data points.
        </p>
      </div>

      {/* Capital + costs */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Advanced</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="initialCapital" className={labelClass}>Capital ($)</label>
            <input
              id="initialCapital"
              name="initialCapital"
              type="number"
              min="100"
              step="100"
              defaultValue="100000"
              className={fieldClass}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="commissionPct" className={labelClass}>Commission %</label>
            <input
              id="commissionPct"
              name="commissionPct"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0.1"
              className={fieldClass}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="slippagePct" className={labelClass}>Slippage %</label>
            <input
              id="slippagePct"
              name="slippagePct"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0.05"
              className={fieldClass}
              disabled={pending}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-loss bg-loss/10 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Starting simulation…
          </>
        ) : (
          "Start Paper Session"
        )}
      </button>
    </form>
  );
}
