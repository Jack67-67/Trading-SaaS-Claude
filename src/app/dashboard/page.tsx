import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TryExampleButton } from "@/components/dashboard/try-example-button";
import { cn } from "@/lib/utils";

// ── Static example result preview ──────────────────────────────────────────────
// Shows what a completed backtest result looks like — fully static, no real data.
function ExampleResultPreview() {
  // A realistic-looking equity curve (roughly +27%)
  const pts = "0,52 45,48 90,44 135,38 180,34 225,38 270,30 315,24 360,28 405,22 450,16 495,12 540,18 585,10 630,6 675,10 720,4 765,0 810,5 855,2";
  const area = `0,60 ${pts} 855,60`;

  return (
    <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-2xs text-text-muted/60 mb-0.5 uppercase tracking-widest font-semibold">Example result</p>
            <p className="text-sm font-bold text-text-primary font-mono">AAPL · Momentum</p>
          </div>
        </div>
        <span className="text-xs font-semibold border rounded-full px-3 py-1 bg-accent/10 text-accent border-accent/20">
          Promising
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 divide-x divide-border bg-surface-0">
        <div className="px-4 py-3.5 text-center">
          <p className="text-xl font-bold font-mono text-profit tabular-nums">+27.4%</p>
          <p className="text-2xs text-text-muted mt-0.5">Total Return</p>
        </div>
        <div className="px-4 py-3.5 text-center">
          <p className="text-xl font-bold font-mono text-accent tabular-nums">1.42</p>
          <p className="text-2xs text-text-muted mt-0.5">Sharpe Ratio</p>
        </div>
        <div className="px-4 py-3.5 text-center">
          <p className="text-xl font-bold font-mono text-profit tabular-nums">58.3%</p>
          <p className="text-2xs text-text-muted mt-0.5">Win Rate</p>
        </div>
      </div>

      {/* Mini equity sparkline */}
      <div className="bg-surface-0 border-t border-border">
        <svg viewBox="0 0 855 60" className="w-full" style={{ height: 52 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="home-preview-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#home-preview-grad)" />
          <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* End dot */}
          <circle cx="855" cy="2" r="3" fill="#22c55e" />
          <circle cx="855" cy="2" r="6" fill="#22c55e" fillOpacity="0.2" />
        </svg>
      </div>

      {/* AI verdict line */}
      <div className="px-5 py-3 border-t border-border/50 bg-surface-1/50 flex items-start gap-2">
        <CheckCircle2 size={12} className="text-profit shrink-0 mt-0.5" />
        <p className="text-xs text-text-muted leading-relaxed">
          Real edge found. Sharpe 1.42, max drawdown −12.1%. Run one out-of-sample test before going live.
        </p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Light query — just enough to know if the user has data for the Overview link
  let hasData = false;
  try {
    const { count } = await supabase
      .from("strategies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    hasData = (count ?? 0) > 0;
  } catch {
    // Non-critical — hasData stays false
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">

      {/* ── Greeting ──────────────────────────────────────────── */}
      <div>
        <p className="text-sm text-text-muted mb-0.5">{greeting},</p>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          {displayName}
        </h1>
        <p className="text-2xs text-text-muted/50 mt-1.5 font-medium tracking-widest uppercase">
          No emotion. No guesswork. Just data.
        </p>
      </div>

      {/* ── What do you want to do? ───────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden relative">
        {/* Subtle dot-grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.09) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Top accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="px-6 pt-6 pb-2 relative">
          <h2 className="text-base font-semibold text-text-primary">
            What do you want to do?
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Describe your idea — we test it on real data in seconds.
          </p>
        </div>

        <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 relative">

          {/* Card 1: Describe a strategy */}
          <Link href="/dashboard/strategies/describe">
            <div className={cn(
              "group rounded-xl border border-accent/30 bg-gradient-to-b from-accent/[0.07] to-surface-1",
              "p-5 flex flex-col items-center text-center gap-3",
              "hover:border-accent/60 hover:from-accent/[0.13] transition-all duration-150",
              "cursor-pointer h-full min-h-[140px] justify-center"
            )}>
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <MessageSquare size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors leading-snug">
                  Describe a strategy
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Write your idea — AI tests it
                </p>
              </div>
            </div>
          </Link>

          {/* Card 2: Generate AI strategy */}
          <Link href="/dashboard/ai-strategy">
            <div className={cn(
              "group rounded-xl border border-border bg-surface-1",
              "p-5 flex flex-col items-center text-center gap-3",
              "hover:border-border-hover hover:bg-surface-2/50 transition-all duration-150",
              "cursor-pointer h-full min-h-[140px] justify-center"
            )}>
              <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
                <Sparkles size={18} className="text-text-secondary group-hover:text-accent transition-colors" />
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
          <TryExampleButton size="card" className="min-h-[140px]" />

        </div>
      </div>

      {/* ── Example result preview ────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-2xs font-semibold text-text-muted/60 uppercase tracking-widest pl-1">
          What you&apos;ll get
        </p>
        <ExampleResultPreview />
      </div>

      {/* ── Overview link (shown only when data exists) ────────── */}
      {hasData && (
        <Link
          href="/dashboard/overview"
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-5 py-4 hover:border-border-hover hover:bg-surface-2/40 transition-all duration-150 group"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
              View your overview
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Performance data, alerts, and recent activity
            </p>
          </div>
          <ArrowRight size={15} className="text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}

    </div>
  );
}
