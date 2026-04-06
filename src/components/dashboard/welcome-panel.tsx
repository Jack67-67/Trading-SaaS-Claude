import Link from "next/link";
import { Sparkles, Code2, ArrowRight, FlaskConical, BarChart3, ShieldCheck } from "lucide-react";

const HOW_IT_WORKS = [
  { icon: Code2,        step: "1", label: "Define a strategy",   desc: "Describe your idea or paste Python — AI can write the full code for you" },
  { icon: FlaskConical, step: "2", label: "Run a backtest",      desc: "Test against years of real market data in seconds" },
  { icon: BarChart3,    step: "3", label: "Read the AI analysis", desc: "AI explains why the strategy worked or struggled, in plain English" },
  { icon: ShieldCheck,  step: "4", label: "Monitor over time",   desc: "Compare runs and track whether your edge is improving or declining" },
];

export function WelcomePanel({ name }: { name: string }) {
  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {/* Top accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="px-8 py-10 text-center max-w-xl mx-auto">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">
            Welcome, {name}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-3 leading-snug">
            Test any trading strategy<br />against historical data
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Build a strategy, backtest it on real market history, and let AI explain
            what the results actually mean — in plain English. Under 2 minutes from
            idea to insights.
          </p>
          <p className="text-xs text-text-muted mt-3">
            Not sure where to start?{" "}
            <span className="text-accent font-medium">Use AI Strategy</span>
            {" "}— no coding required.
          </p>
        </div>

        {/* Two paths */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
          {/* AI path */}
          <Link
            href="/dashboard/ai-strategy"
            className="group flex flex-col gap-3 p-6 bg-surface-0 hover:bg-accent/[0.04] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles size={18} className="text-accent" />
              </div>
              <span className="text-2xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5">
                Recommended
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                Generate with AI
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                No Python required. Describe your idea in plain English — e.g.
                &quot;buy oversold crypto on the daily chart&quot; — and we&apos;ll
                write the code, run the backtest, and explain the results.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent mt-auto">
              Get started <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          {/* Manual path */}
          <Link
            href="/dashboard/strategies/new"
            className="group flex flex-col gap-3 p-6 bg-surface-0 hover:bg-surface-2/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
              <Code2 size={18} className="text-text-secondary" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                Write your own strategy
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Already have Python code or a specific idea to implement? Paste
                your strategy, set the entry rules and risk parameters, and test
                it against any symbol and date range.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted group-hover:text-accent transition-colors mt-auto">
              Open editor <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>
      </div>

      {/* How it works */}
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
