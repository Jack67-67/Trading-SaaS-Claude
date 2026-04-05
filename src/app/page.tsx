import Link from "next/link";
import {
  Sparkles, Code2, BarChart3, Activity,
  ArrowRight, CheckCircle2, TrendingUp, BellRing,
  Zap, ShieldCheck, ChevronRight, LineChart,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: `${APP_NAME} — AI-powered backtesting for systematic traders`,
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-text-primary overflow-x-hidden">
      <Navbar />
      <Hero />
      <Benefits />
      <HowItWorks />
      <CtaBanner />
      <Footer />
    </div>
  );
}

// ── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 lg:px-10 border-b border-border bg-surface-0/80 backdrop-blur-xl">
      <Logo size="sm" />
      <nav className="hidden sm:flex items-center gap-6 text-sm text-text-muted">
        <a href="#benefits" className="hover:text-text-primary transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it works</a>
        <Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
      </nav>
      <div className="flex items-center gap-2.5">
        <Link
          href="/auth/login"
          className="h-8 px-3.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors flex items-center"
        >
          Sign in
        </Link>
        <Link
          href="/auth/register"
          className="h-8 px-3.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-1.5"
        >
          Get started <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 lg:px-10 grid-bg overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-accent/6 rounded-full blur-3xl pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-accent/4 rounded-full blur-3xl pointer-events-none translate-x-1/2" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Left — copy */}
          <div className="space-y-7">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/8 text-xs font-semibold text-accent">
              <Sparkles size={11} />
              AI-powered · Python-native
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">
                AI that builds, tests and monitors{" "}
                <span className="text-accent">trading strategies</span>{" "}
                for you.
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg">
                Describe your idea or let the AI generate a complete strategy.
                Run a backtest in seconds, then get ongoing performance monitoring
                and alerts — all in one place.
              </p>
            </div>

            {/* 2 main paths */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link
                href="/auth/register"
                className="group h-11 px-6 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} />
                Use AI strategy
                <span className="text-2xs font-bold bg-white/20 rounded px-1.5 py-0.5 leading-none">
                  Recommended
                </span>
              </Link>
              <Link
                href="/auth/register"
                className="h-11 px-6 rounded-xl text-sm font-semibold border border-border bg-surface-1 text-text-primary hover:bg-surface-2 hover:border-border-hover transition-colors flex items-center gap-2"
              >
                <Code2 size={14} />
                Build your own
              </Link>
            </div>

            {/* Trust pills */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {["Free to start", "No credit card required", "Results in seconds"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <CheckCircle2 size={12} className="text-profit/70 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — product mockup */}
          <div className="relative">
            <ProductMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Product mockup ────────────────────────────────────────────────────────────

function ProductMockup() {
  const pts = [
    [0, 118], [60, 110], [120, 122], [190, 102], [260, 114],
    [340, 88], [420, 96], [500, 72], [580, 80], [660, 56],
    [740, 44], [800, 28],
  ];
  const linePts = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPts = `0,160 ${linePts} 800,160`;
  const breakEvenY = 118;
  const [xN, yN] = pts[pts.length - 1];

  return (
    <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/5">
      {/* KPI strip */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <KpiCell label="Total Return" value="+34.2%" positive />
        <KpiCell label="Sharpe Ratio" value="1.84" positive />
        <KpiCell label="Win Rate" value="61.3%" positive />
      </div>

      {/* Chart header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <p className="text-xs font-semibold text-text-primary">Equity Curve</p>
          <p className="text-2xs text-text-muted mt-0.5">SPY · RSI Mean Reversion · 1d</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-text-muted">$100,000</span>
          <span className="text-text-muted">→</span>
          <span className="text-profit font-semibold">$134,200</span>
        </div>
      </div>

      {/* SVG equity chart */}
      <svg viewBox="0 0 800 160" className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lp-chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
            <stop offset="85%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        <line x1="0" y1={breakEvenY} x2="800" y2={breakEvenY}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="6 5" />
        <polygon points={areaPts} fill="url(#lp-chart-gradient)" />
        <polyline points={linePts} fill="none" stroke="#22c55e" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xN} cy={yN} r="7" fill="#22c55e" fillOpacity="0.15" />
        <circle cx={xN} cy={yN} r="4" fill="#22c55e" />
      </svg>

      {/* AI insight strip */}
      <div className="px-5 py-3.5 border-t border-border flex items-center gap-2.5 bg-accent/[0.03]">
        <Sparkles size={12} className="text-accent shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          <span className="text-accent font-semibold">AI: </span>
          Strong risk-adjusted returns. Drawdown well-controlled at 12.4%. Sharpe of 1.84 indicates a meaningful edge.
        </p>
      </div>
    </div>
  );
}

function KpiCell({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="px-5 py-4 bg-surface-1">
      <p className="text-2xs font-semibold text-text-muted uppercase tracking-widest mb-2">{label}</p>
      <p className={cn("text-2xl font-bold font-mono tabular-nums tracking-tight", positive ? "text-profit" : "text-loss")}>
        {value}
      </p>
    </div>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: Sparkles,
    title: "AI insights on every backtest",
    desc: "After each run, the AI explains what worked, what didn't, and why — in plain language. No manual interpretation required.",
    accent: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  {
    icon: LineChart,
    title: "Performance monitoring",
    desc: "Compare results across runs automatically. See whether your strategy is improving, stable, or declining over time.",
    accent: "text-profit",
    bg: "bg-profit/10",
    border: "border-profit/20",
  },
  {
    icon: BellRing,
    title: "Intelligent alerts",
    desc: "Get notified when drawdown spikes, returns drop, or your strategy shows signs of stress — before you go live.",
    accent: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    icon: TrendingUp,
    title: "Strategy improvement suggestions",
    desc: "The AI identifies weak areas in your strategy — thin trade counts, poor Sharpe, elevated risk — and tells you what to review.",
    accent: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
];

function Benefits() {
  return (
    <section id="benefits" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">Why {APP_NAME}</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            More than a backtest runner
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Most tools just run the numbers. {APP_NAME} explains them, tracks them over time, and tells you when to pay attention.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFITS.map(({ icon: Icon, title, desc, accent, bg, border }) => (
            <div
              key={title}
              className={cn("rounded-2xl border bg-surface-1 p-6", border)}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bg)}>
                <Icon size={18} className={accent} />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    icon: Sparkles,
    title: "Define or generate a strategy",
    desc: "Write a Python strategy class, pick from templates, or describe your idea and let the AI generate one for you.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Run the backtest",
    desc: "Pick a symbol, timeframe, and date range. Results come back in seconds with a full analytics report.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "Get AI analysis",
    desc: "The AI reads your results and gives you a plain-language summary: what's working, what to watch, and what to improve.",
  },
  {
    n: "04",
    icon: Activity,
    title: "Monitor over time",
    desc: "Run again after tweaking your strategy. Track whether performance is improving, stable, or declining across runs.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-10 bg-surface-1/40 border-y border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">How it works</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            From idea to insight in minutes
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Four steps from strategy concept to ongoing performance monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-5 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] h-px bg-border" />

          {STEPS.map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="relative flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-accent" />
                </div>
                <span className="text-2xs font-mono font-bold text-text-muted tracking-widest">{n}</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA banner ────────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-24 px-6 lg:px-10 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[300px] bg-accent/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-7">
        <div className="space-y-3">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Start building smarter strategies
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Free to start. No credit card required. Your first AI-generated strategy is one click away.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/auth/register"
            className="h-11 px-7 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-2"
          >
            <Sparkles size={14} />
            Get started free
          </Link>
          <Link
            href="/pricing"
            className="h-11 px-7 rounded-xl text-sm font-semibold border border-border bg-surface-1 text-text-primary hover:bg-surface-2 hover:border-border-hover transition-colors flex items-center gap-2"
          >
            View pricing <ChevronRight size={14} />
          </Link>
        </div>

        <p className="text-xs text-text-muted">
          No credit card required · Free to start · Cancel anytime
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-6 lg:px-10 py-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 flex-wrap">
        <Logo size="sm" />
        <div className="flex items-center gap-6 text-xs text-text-muted">
          <Link href="/pricing" className="hover:text-text-secondary transition-colors">Pricing</Link>
          <Link href="/auth/login" className="hover:text-text-secondary transition-colors">Sign in</Link>
          <Link href="/auth/register" className="hover:text-text-secondary transition-colors">Get started</Link>
        </div>
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
