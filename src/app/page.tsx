import Link from "next/link";
import {
  Sparkles, Code2, BarChart3, Activity,
  ArrowRight, CheckCircle2, TrendingUp,
  ChevronRight, Zap, ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: `${APP_NAME} — AI-powered backtesting for systematic traders`,
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-text-primary overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <CtaBanner />
      <Footer />
    </div>
  );
}

// ── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 lg:px-10 border-b border-border bg-surface-0/80 backdrop-blur-xl">
      <Logo size="sm" />
      <nav className="hidden sm:flex items-center gap-6 text-sm text-text-muted">
        <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it works</a>
      </nav>
      <div className="flex items-center gap-2.5">
        <Link
          href="/auth/login"
          className="h-8 px-3.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors flex items-center"
        >
          Sign In
        </Link>
        <Link
          href="/auth/register"
          className="h-8 px-3.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-1.5"
        >
          Get Started <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

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
              Powered by AI · Python-native
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Strategy research
                <br />
                at the speed of
                <br />
                <span className="text-accent">machine intelligence.</span>
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg">
                Define your edge in Python, let the AI generate and test it,
                and get institutional-grade analytics — in seconds.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/auth/register"
                className="h-11 px-6 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-2"
              >
                Start for free <ArrowRight size={14} />
              </Link>
              <Link
                href="/auth/login"
                className="h-11 px-6 rounded-xl text-sm font-semibold border border-border bg-surface-1 text-text-primary hover:bg-surface-2 hover:border-border-hover transition-colors flex items-center gap-2"
              >
                Sign in
              </Link>
            </div>

            {/* Trust pills */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {["No credit card required", "Free to start", "Open Python API"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <CheckCircle2 size={12} className="text-profit/70 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — product preview mockup */}
          <div className="relative">
            <ProductMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Product mockup ──────────────────────────────────────────────────────────

function ProductMockup() {
  // Equity curve points (SVG 800×160 space)
  const pts = [
    [0, 118], [60, 110], [120, 122], [190, 102], [260, 114],
    [340, 88], [420, 96], [500, 72], [580, 80], [660, 56],
    [740, 44], [800, 28],
  ];
  const linePts = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPts = `0,160 ${linePts} 800,160`;
  const breakEvenY = 118;
  const [xN, yN] = pts[pts.length - 1];
  const retPct = "+34.2%";

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
      <svg
        viewBox="0 0 800 160"
        className="w-full"
        style={{ height: 160 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lp-chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
            <stop offset="85%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[40, 80, 120].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {/* Break-even */}
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
          <span className="text-accent font-semibold">AI Summary: </span>
          Strong risk-adjusted returns. Drawdown well-controlled at 12.4%.
          Sharpe of 1.84 indicates meaningful edge beyond market exposure.
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

// ── Features ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Strategy Generator",
    desc: "Describe your risk profile and time horizon. The AI designs, codes, and backtests a complete Python strategy in seconds — no prior coding required.",
    accent: "text-accent",
    bg: "bg-accent/10",
    topLine: "bg-accent",
    border: "border-accent/20",
  },
  {
    icon: BarChart3,
    title: "Deep Performance Analytics",
    desc: "Sharpe, Sortino, Calmar, max drawdown, win rate, profit factor, and more. Every backtest produces a full institutional-grade report.",
    accent: "text-violet-400",
    bg: "bg-violet-400/10",
    topLine: "bg-violet-400",
    border: "border-violet-400/20",
  },
  {
    icon: Activity,
    title: "Real-time Execution",
    desc: "Watch your backtest run live. Status updates stream in sub-second via Supabase Realtime — no polling, no page refresh.",
    accent: "text-profit",
    bg: "bg-profit/10",
    topLine: "bg-profit",
    border: "border-profit/20",
  },
  {
    icon: Code2,
    title: "Python-native Strategies",
    desc: "Write any strategy in Python with full library access. Use NumPy, Pandas, TA-Lib, or your own custom signals — we run it as-is.",
    accent: "text-amber-400",
    bg: "bg-amber-400/10",
    topLine: "bg-amber-400",
    border: "border-amber-400/20",
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">Features</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Everything you need to find your edge
          </h2>
          <p className="text-text-secondary leading-relaxed">
            From AI-generated strategies to deep analytics — all the tools systematic
            traders need, without the infrastructure overhead.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, accent, bg, topLine, border }) => (
            <div
              key={title}
              className={cn(
                "relative rounded-2xl border bg-surface-1 p-6 overflow-hidden",
                border
              )}
            >
              {/* Top accent line */}
              <div className={cn("absolute top-0 left-6 right-6 h-px opacity-50", topLine)} />

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

// ── How it works ────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    icon: Code2,
    title: "Define your strategy",
    desc: "Write a Python strategy class, pick from templates, or let the AI generate one based on your risk profile and time horizon.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Run the backtest",
    desc: "Select a symbol, interval, and date range. We simulate live trading conditions against years of historical market data in seconds.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "Analyze and refine",
    desc: "Get a full analytics report — equity curve, Sharpe, drawdown, win rate — plus AI-generated insights and recommendations.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-10 bg-surface-1/40 border-y border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">How it works</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            From idea to insight in minutes
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Three steps from strategy concept to production-quality backtest results.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-border" />

          {STEPS.map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="relative flex flex-col gap-4">
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-accent" />
                </div>
                <span className="text-2xs font-mono font-bold text-text-muted tracking-widest">{n}</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA banner ──────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-24 px-6 lg:px-10 relative overflow-hidden">
      {/* Orbs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[300px] bg-accent/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-7">
        <div className="space-y-3">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Ready to find your edge?
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Join traders using {APP_NAME} to build, test, and refine systematic strategies
            with AI-grade speed and precision.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/auth/register"
            className="h-11 px-7 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-2"
          >
            Start for free <ArrowRight size={14} />
          </Link>
          <Link
            href="/auth/login"
            className="h-11 px-7 rounded-xl text-sm font-semibold border border-border bg-surface-1 text-text-primary hover:bg-surface-2 hover:border-border-hover transition-colors flex items-center gap-2"
          >
            Sign in <ChevronRight size={14} />
          </Link>
        </div>

        <p className="text-xs text-text-muted">
          No credit card required · Free to start · Cancel anytime
        </p>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-6 lg:px-10 py-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 flex-wrap">
        <Logo size="sm" />
        <div className="flex items-center gap-6 text-xs text-text-muted">
          <Link href="/auth/login" className="hover:text-text-secondary transition-colors">Sign In</Link>
          <Link href="/auth/register" className="hover:text-text-secondary transition-colors">Get Started</Link>
          <Link href="/dashboard" className="hover:text-text-secondary transition-colors">Dashboard</Link>
        </div>
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
