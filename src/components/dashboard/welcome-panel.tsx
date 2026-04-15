import Link from "next/link";
import { Sparkles, MessageSquare, Code2, FlaskConical, BarChart3, ShieldCheck } from "lucide-react";
import { TryExampleButton } from "@/components/dashboard/try-example-button";

const HOW_IT_WORKS = [
  { icon: Code2,        step: "1", label: "Define a strategy",    desc: "Describe your idea or paste Python — AI can write the full code for you" },
  { icon: FlaskConical, step: "2", label: "Run a backtest",       desc: "Test against real historical data in seconds" },
  { icon: BarChart3,    step: "3", label: "Read the AI analysis", desc: "AI explains why the strategy worked or struggled, in plain English" },
  { icon: ShieldCheck,  step: "4", label: "Monitor over time",    desc: "Compare runs and track whether your edge is improving or declining" },
];

export function WelcomePanel({ name }: { name: string }) {
  return (
    <div className="space-y-6">

      {/* ── What do you want to do? ────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="px-6 pt-8 pb-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
            Welcome, {name}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mb-6">
            What do you want to do?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Card 1: Describe a strategy */}
            <Link href="/dashboard/strategies/describe">
              <div className="group rounded-xl border border-accent/30 bg-gradient-to-b from-accent/[0.07] to-surface-1 p-5 flex flex-col items-center text-center gap-3 hover:border-accent/60 hover:from-accent/[0.13] transition-all duration-150 cursor-pointer h-full min-h-[152px] justify-center">
                <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center">
                  <MessageSquare size={20} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors leading-snug">
                    Describe a strategy
                  </p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Write your idea in plain English
                  </p>
                </div>
              </div>
            </Link>

            {/* Card 2: Generate AI strategy */}
            <Link href="/dashboard/ai-strategy">
              <div className="group rounded-xl border border-border bg-surface-1 p-5 flex flex-col items-center text-center gap-3 hover:border-border-hover hover:bg-surface-2/50 transition-all duration-150 cursor-pointer h-full min-h-[152px] justify-center">
                <div className="w-11 h-11 rounded-xl bg-surface-3 flex items-center justify-center">
                  <Sparkles size={20} className="text-text-secondary group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors leading-snug">
                    Generate AI strategy
                  </p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Pick a style, AI builds it
                  </p>
                </div>
              </div>
            </Link>

            {/* Card 3: Try example */}
            <TryExampleButton size="card" className="min-h-[152px]" />

          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3 px-1">
          How it works
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {HOW_IT_WORKS.map(({ icon: Icon, step, label, desc }) => (
            <div
              key={step}
              className="rounded-xl border border-border bg-surface-1 p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xs font-mono font-bold text-accent/50 w-4">{step}</span>
                <Icon size={13} className="text-accent/70" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary">{label}</p>
                <p className="text-2xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
