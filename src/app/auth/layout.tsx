import { Sparkles, BarChart3, Code2, Activity, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const features = [
  {
    icon: Sparkles,
    title: "AI Strategy Generator",
    desc: "Describe your edge. Get production-ready Python code, automatically backtested.",
  },
  {
    icon: BarChart3,
    title: "Deep Performance Analytics",
    desc: "Sharpe, drawdown, win rate, profit factor — 10+ metrics per run.",
  },
  {
    icon: Activity,
    title: "Real-time Execution",
    desc: "Watch your backtest run live with sub-second status updates.",
  },
  {
    icon: Code2,
    title: "Python-native Strategies",
    desc: "Write any strategy class with full library support and version control.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex grid-bg">

      {/* ── Left branding panel ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 bg-surface-0 border-r border-border relative overflow-hidden shrink-0">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-accent/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-80 h-80 bg-accent/4 rounded-full blur-3xl pointer-events-none" />

        <Logo size="lg" />

        <div className="relative z-10 space-y-10">
          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-[2rem] font-bold tracking-tight text-text-primary leading-[1.2]">
              Strategy research,<br />
              at the speed of<br />
              <span className="text-accent">machine intelligence.</span>
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
              Define your edge in Python, let the AI generate and test it, and get
              institutional-grade analytics in seconds.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary leading-snug">{title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust footer */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {["256-bit encryption", "SOC 2 compliant", "99.9% uptime"].map((badge, i, arr) => (
            <span key={badge} className="flex items-center gap-2 text-xs text-text-muted">
              <CheckCircle2 size={12} className="text-profit/60 shrink-0" />
              {badge}
              {i < arr.length - 1 && <span className="w-px h-3 bg-border ml-0.5" />}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form area ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size="lg" />
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-surface-1 p-7 shadow-xl shadow-black/20">
            {children}
          </div>
        </div>
      </div>

    </div>
  );
}
