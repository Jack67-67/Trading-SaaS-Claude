import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TryExampleButton } from "@/components/dashboard/try-example-button";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8 animate-fade-in max-w-2xl">

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
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-text-primary">
            What do you want to do?
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Test an idea, generate a strategy, or see a live example.
          </p>
        </div>

        <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">

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
