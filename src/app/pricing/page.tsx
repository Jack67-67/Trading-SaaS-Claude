import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Sparkles, Code2,
  Activity, Bot, Clock, Lock,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: `Pricing — ${APP_NAME}`,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <Navbar />
      <main className="pt-24 pb-20 px-6 lg:px-10">
        <div className="max-w-4xl mx-auto space-y-16">
          <Header />
          <PricingCards />
          <FeatureComparison />
          <Faq />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 lg:px-10 border-b border-border bg-surface-0/80 backdrop-blur-xl">
      <Logo size="sm" />
      <nav className="hidden sm:flex items-center gap-6 text-sm text-text-muted">
        <Link href="/#benefits" className="hover:text-text-primary transition-colors">Features</Link>
        <Link href="/#how-it-works" className="hover:text-text-primary transition-colors">How it works</Link>
        <Link href="/pricing" className="text-text-primary font-medium">Pricing</Link>
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

// ── Header ────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="text-center space-y-4 max-w-xl mx-auto pt-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/8 text-xs font-semibold text-accent">
        <Sparkles size={11} />
        Early access — everything free right now
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
      <p className="text-text-secondary leading-relaxed">
        Start with everything included. A Pro plan is coming — you&apos;ll always keep what you had for free.
      </p>
    </div>
  );
}

// ── Pricing cards ─────────────────────────────────────────────────────────────

function PricingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
      <FreeCard />
      <ProCard />
    </div>
  );
}

function FreeCard() {
  const features = [
    "Up to 5 strategies",
    "Unlimited backtests",
    "Paper trading (simulated)",
    "Shadow mode autotrading",
    "AI strategy generator",
    "AI insights and summaries",
    "Performance analytics",
    "Basic live autotrading",
  ];
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-7 flex flex-col gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-muted uppercase tracking-widest">Free</p>
          <span className="text-2xs font-bold bg-profit/10 text-profit border border-profit/25 rounded-full px-2.5 py-1">
            Early access
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">$0</span>
          <span className="text-sm text-text-muted">/ forever</span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Full access during early access. No credit card, no trial limit — just start.
        </p>
      </div>

      <Link
        href="/auth/register"
        className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors bg-surface-2 hover:bg-surface-3 text-text-primary border border-border hover:border-border-hover"
      >
        Get started free
        <ArrowRight size={13} />
      </Link>

      <ul className="space-y-2.5">
        {features.map((text) => (
          <li key={text} className="flex items-start gap-2.5 text-sm text-text-secondary">
            <CheckCircle2 size={15} className="text-profit shrink-0 mt-0.5" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProCard() {
  const features = [
    "Unlimited strategies",
    "Live autotrading (real orders)",
    "Advanced risk controls",
    "More markets and instruments",
    "Priority AI analysis",
    "Team access (coming later)",
    "Dedicated support",
    "Everything in Free",
  ];
  return (
    <div className="relative rounded-2xl border border-border/50 bg-surface-1/50 p-7 flex flex-col gap-6 overflow-hidden">
      {/* Subtle top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-text-muted/20 to-transparent" />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-muted/60 uppercase tracking-widest">Pro</p>
          <span className="text-2xs font-bold bg-surface-3 text-text-muted border border-border rounded-full px-2.5 py-1 flex items-center gap-1.5">
            <Clock size={10} />
            Coming soon
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-text-muted/50">—</span>
        </div>
        <p className="text-sm text-text-muted/70 leading-relaxed">
          Advanced live trading, more markets, and team features. Pricing will be announced before launch.
        </p>
      </div>

      {/* Notify button — no payment logic */}
      <div className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-surface-0/60 text-text-muted/50 border border-border/40 cursor-default select-none">
        <Lock size={13} />
        Not available yet
      </div>

      <ul className="space-y-2.5">
        {features.map((text) => (
          <li key={text} className="flex items-start gap-2.5 text-sm text-text-muted/50">
            <div className="w-[15px] h-[15px] rounded-full border border-border/40 shrink-0 mt-0.5" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Feature comparison ────────────────────────────────────────────────────────

const COMPARISON_SECTIONS = [
  {
    label: "Backtesting",
    icon: Code2,
    rows: [
      { feature: "Python strategy editor",         free: true,          pro: true },
      { feature: "Number of strategies",           free: "Up to 5",     pro: "Unlimited" },
      { feature: "Backtests per month",            free: "Unlimited",   pro: "Unlimited" },
      { feature: "Historical data",                free: true,          pro: true },
      { feature: "Equity curve + metrics",         free: true,          pro: true },
      { feature: "AI insights and summaries",      free: true,          pro: true },
    ],
  },
  {
    label: "Trading",
    icon: Activity,
    rows: [
      { feature: "Paper trading (simulated)",      free: true,          pro: true },
      { feature: "Shadow mode (signal monitoring)",free: true,          pro: true },
      { feature: "Basic live autotrading",         free: true,          pro: true },
      { feature: "Full live autotrading",          free: false,         pro: "Coming soon" },
      { feature: "More markets and instruments",   free: false,         pro: "Coming soon" },
    ],
  },
  {
    label: "AI & Monitoring",
    icon: Sparkles,
    rows: [
      { feature: "AI strategy generator",          free: true,          pro: true },
      { feature: "Performance alerts",             free: true,          pro: true },
      { feature: "Run comparison",                 free: true,          pro: true },
      { feature: "Priority AI analysis",           free: false,         pro: "Coming soon" },
    ],
  },
  {
    label: "Autotrading",
    icon: Bot,
    rows: [
      { feature: "Broker connection (Alpaca)",     free: true,          pro: true },
      { feature: "Risk controls & safety limits",  free: true,          pro: true },
      { feature: "Kill switch",                    free: true,          pro: true },
      { feature: "Advanced risk profiles",         free: false,         pro: "Coming soon" },
    ],
  },
];

function FeatureComparison() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary text-center">What&apos;s included</h2>

      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-3 border-b border-border bg-surface-1">
          <div className="px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Feature</div>
          <div className="px-5 py-3.5 text-xs font-semibold text-profit uppercase tracking-wider text-center border-l border-border">
            Free · Early access
          </div>
          <div className="px-5 py-3.5 text-xs font-semibold text-text-muted/50 uppercase tracking-wider text-center border-l border-border">
            Pro · Coming soon
          </div>
        </div>

        {COMPARISON_SECTIONS.map(({ label, icon: Icon, rows }, si) => (
          <div key={label}>
            <div className={cn(
              "flex items-center gap-2 px-5 py-2.5 bg-surface-0/50 border-b border-border",
              si > 0 && "border-t"
            )}>
              <Icon size={13} className="text-text-muted" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
            </div>
            {rows.map(({ feature, free, pro }) => (
              <div key={feature} className="grid grid-cols-3 border-b border-border/50 last:border-b-0">
                <div className="px-5 py-3 text-sm text-text-secondary">{feature}</div>
                <div className="px-5 py-3 border-l border-border/50 flex items-center justify-center">
                  <CellValue value={free} />
                </div>
                <div className="px-5 py-3 border-l border-border/50 flex items-center justify-center bg-surface-0/20">
                  <CellValue value={pro} muted />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CellValue({ value, muted }: { value: boolean | string; muted?: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={cn(
        "text-xs font-medium",
        muted ? "text-text-muted/50" : "text-text-secondary"
      )}>
        {value}
      </span>
    );
  }
  if (value) {
    return <CheckCircle2 size={15} className={muted ? "text-text-muted/30" : "text-profit"} />;
  }
  return <div className="w-4 h-px bg-border/50" />;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Is the free plan really free, forever?",
    a: "Yes. During early access, everything is free with no time limit. When Pro launches, you'll keep your free tier — we'll never retroactively remove features you already have.",
  },
  {
    q: "When is the Pro plan launching?",
    a: "We haven't set a date yet. The focus right now is building the core product. We'll announce pricing before it goes live.",
  },
  {
    q: "What's the difference between paper trading and live autotrading?",
    a: "Paper trading runs fully simulated — no real money, no broker connection needed. Live autotrading connects to your broker (e.g. Alpaca) and places real orders. The Free plan includes basic live autotrading with safety limits built in.",
  },
  {
    q: "Is my strategy code private?",
    a: "Yes. Your strategy code and backtest results are private and only accessible to your account.",
  },
  {
    q: "Do I need a broker account?",
    a: "Only for live autotrading. Backtesting and paper trading work without any broker connection.",
  },
];

function Faq() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-text-primary text-center">Common questions</h2>
      <div className="space-y-2">
        {FAQ_ITEMS.map(({ q, a }) => (
          <div key={q} className="rounded-xl border border-border bg-surface-1 px-5 py-4 space-y-1.5">
            <p className="text-sm font-semibold text-text-primary">{q}</p>
            <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-6 lg:px-10 py-8 mt-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-6 flex-wrap">
        <Logo size="sm" />
        <div className="flex items-center gap-6 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-secondary transition-colors">Home</Link>
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
