import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Sparkles, Code2,
  Activity,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: `Pricing — ${APP_NAME}`,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  cta: string;
  ctaHref: string;
  featured: boolean;
  badge?: string;
  features: PlanFeature[];
}

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    description: "For traders getting started. Build strategies and run backtests at no cost.",
    cta: "Get started free",
    ctaHref: "/auth/register",
    featured: false,
    features: [
      { text: "Up to 3 strategies", included: true },
      { text: "Unlimited backtests", included: true },
      { text: "Basic performance metrics (return, Sharpe, drawdown)", included: true },
      { text: "Equity curve chart", included: true },
      { text: "Python strategy editor", included: true },
      { text: "AI insights and summaries", included: false },
      { text: "Performance alerts", included: false },
      { text: "Run comparison and trend tracking", included: false },
      { text: "AI strategy generator", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    description: "For serious traders who want AI-powered analysis, monitoring, and alerts.",
    cta: "Start Pro",
    ctaHref: "/auth/register",
    featured: true,
    badge: "Most popular",
    features: [
      { text: "Unlimited strategies", included: true },
      { text: "Unlimited backtests", included: true },
      { text: "Full performance analytics", included: true },
      { text: "Equity curve chart", included: true },
      { text: "Python strategy editor", included: true },
      { text: "AI insights and summaries", included: true },
      { text: "Performance alerts (critical, warning, info)", included: true },
      { text: "Run comparison and trend tracking", included: true },
      { text: "AI strategy generator", included: true },
    ],
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <Navbar />
      <main className="pt-24 pb-20 px-6 lg:px-10">
        <div className="max-w-4xl mx-auto space-y-14">
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
    <div className="text-center space-y-3 max-w-xl mx-auto pt-6">
      <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
      <p className="text-text-secondary leading-relaxed">
        Start for free. Upgrade when you need AI insights, alerts, and trend tracking.
      </p>
    </div>
  );
}

// ── Pricing cards ─────────────────────────────────────────────────────────────

function PricingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {PLANS.map((plan) => (
        <PlanCard key={plan.name} plan={plan} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className={cn(
      "relative rounded-2xl border p-7 flex flex-col gap-6 overflow-hidden",
      plan.featured
        ? "border-accent/40 bg-accent/[0.04]"
        : "border-border bg-surface-1"
    )}>
      {/* Top accent line for featured */}
      {plan.featured && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      )}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-muted uppercase tracking-widest">{plan.name}</p>
          {plan.badge && (
            <span className="text-2xs font-bold bg-accent/15 text-accent border border-accent/30 rounded-full px-2.5 py-1">
              {plan.badge}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
          {plan.period && (
            <span className="text-sm text-text-muted">{plan.period}</span>
          )}
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{plan.description}</p>
      </div>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className={cn(
          "w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
          plan.featured
            ? "bg-accent hover:bg-accent-hover text-white"
            : "bg-surface-2 hover:bg-surface-3 text-text-primary border border-border hover:border-border-hover"
        )}
      >
        {plan.featured && <Sparkles size={13} />}
        {plan.cta}
        <ArrowRight size={13} />
      </Link>

      {/* Features */}
      <ul className="space-y-2.5">
        {plan.features.map(({ text, included }) => (
          <li key={text} className={cn(
            "flex items-start gap-2.5 text-sm",
            included ? "text-text-secondary" : "text-text-muted/50"
          )}>
            {included
              ? <CheckCircle2 size={15} className="text-profit shrink-0 mt-0.5" />
              : <div className="w-[15px] h-[15px] rounded-full border border-border/50 shrink-0 mt-0.5" />
            }
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
    label: "Core",
    icon: Code2,
    rows: [
      { feature: "Strategy editor (Python)", free: true, pro: true },
      { feature: "Number of strategies", free: "Up to 3", pro: "Unlimited" },
      { feature: "Backtests per month", free: "Unlimited", pro: "Unlimited" },
      { feature: "Historical data", free: true, pro: true },
      { feature: "Equity curve + basic metrics", free: true, pro: true },
    ],
  },
  {
    label: "AI",
    icon: Sparkles,
    rows: [
      { feature: "AI strategy generator", free: false, pro: true },
      { feature: "AI insights and summaries", free: false, pro: true },
      { feature: "Strategy improvement suggestions", free: false, pro: true },
    ],
  },
  {
    label: "Monitoring",
    icon: Activity,
    rows: [
      { feature: "Run comparison (vs. previous run)", free: false, pro: true },
      { feature: "Trend tracking (Improving / Stable / Declining)", free: false, pro: true },
      { feature: "Performance alerts (critical, warning, info)", free: false, pro: true },
      { feature: "AI activity log", free: false, pro: true },
    ],
  },
];

function FeatureComparison() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary text-center">What&apos;s included</h2>

      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-3 border-b border-border bg-surface-1">
          <div className="px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Feature</div>
          <div className="px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider text-center border-l border-border">Free</div>
          <div className="px-5 py-3.5 text-xs font-semibold text-accent uppercase tracking-wider text-center border-l border-border">Pro</div>
        </div>

        {COMPARISON_SECTIONS.map(({ label, icon: Icon, rows }, si) => (
          <div key={label}>
            {/* Section label */}
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
                <div className="px-5 py-3 border-l border-border/50 flex items-center justify-center bg-accent/[0.02]">
                  <CellValue value={pro} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-xs text-text-secondary font-medium">{value}</span>;
  }
  if (value) {
    return <CheckCircle2 size={15} className="text-profit" />;
  }
  return <div className="w-4 h-px bg-border" />;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Can I use the Free plan indefinitely?",
    a: "Yes. The Free plan has no time limit. You can create strategies and run backtests for as long as you want.",
  },
  {
    q: "What do 'AI insights' actually mean?",
    a: "After each backtest, the AI analyzes your results and generates a plain-language summary: what the key metrics mean, what's working, what's risky, and what to consider changing.",
  },
  {
    q: "What are performance alerts?",
    a: "Alerts fire automatically when something notable happens — drawdown spikes, return collapses, or strategy improvement. They're shown on your dashboard so you never miss a signal.",
  },
  {
    q: "Is my strategy code private?",
    a: "Yes. Your strategy code and backtest results are private and only accessible to your account.",
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
    <footer className="border-t border-border px-6 lg:px-10 py-8">
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
