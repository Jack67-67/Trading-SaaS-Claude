import type { Metadata } from "next";
import { User, Key, AlertTriangle, LogOut, Shield, Calendar, Mail, Hash, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { BrokerConnectionSection } from "@/components/dashboard/broker-connection-section";
import type { BrokerConnectionRow } from "@/app/actions/broker";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "User";

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const tier = profile?.subscription_tier || "free";
  const apiUrl =
    (process.env.NEXT_PUBLIC_BACKTEST_API_URL || "http://localhost:8000") + "/api/v1";

  // Fetch broker connections (exclude credentials — server-side only)
  let brokerConnections: BrokerConnectionRow[] = [];
  try {
    const { data: conns } = await supabase
      .from("broker_connections")
      .select("id, broker, status, display_name, account_number, error_message, last_verified_at, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });
    brokerConnections = (conns as BrokerConnectionRow[]) ?? [];
  } catch {
    // Table may not exist yet (pre-migration) — graceful fallback
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">

      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* ── Account ───────────────────────────────────────────── */}
      <Section icon={User} title="Account">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-accent font-mono">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-text-primary leading-snug">{displayName}</p>
            <p className="text-sm text-text-muted font-mono truncate">{user?.email}</p>
          </div>
          <div className="ml-auto shrink-0">
            <PlanBadge tier={tier} />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <MetaItem
            icon={Mail}
            label="Email"
            value={user?.email ?? "—"}
            mono
          />
          <MetaItem
            icon={Shield}
            label="Plan"
            value={tier.charAt(0).toUpperCase() + tier.slice(1)}
          />
          {memberSince && (
            <MetaItem
              icon={Calendar}
              label="Member since"
              value={memberSince}
            />
          )}
          <MetaItem
            icon={Hash}
            label="User ID"
            value={user?.id?.slice(0, 16) + "…"}
            mono
          />
        </div>
      </Section>

      {/* ── API Access ────────────────────────────────────────── */}
      <Section icon={Key} title="API Access">
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          Use your Supabase JWT to authenticate with the backtest API. The token
          is automatically included in all requests made from this dashboard.
        </p>
        <div className="space-y-2">
          <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
            Backtest API Endpoint
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-surface-0 border border-border px-4 py-3">
            <code className="text-sm text-accent font-mono flex-1 truncate">{apiUrl}</code>
            <span className="text-2xs text-text-muted bg-surface-3 px-2 py-0.5 rounded shrink-0">
              REST
            </span>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3 leading-relaxed">
          Authentication is handled via the <code className="font-mono text-text-secondary">Authorization: Bearer</code> header using your session token.
        </p>
      </Section>

      {/* ── Broker Connection ─────────────────────────────────── */}
      <Section icon={Link2} title="Broker Connection">
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          Connect your brokerage account to see live balance, positions, and account status.
          This is read-only — no orders are placed until you explicitly enable live execution.
        </p>
        <BrokerConnectionSection initialConnections={brokerConnections} />
      </Section>

      {/* ── Danger Zone ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-loss/20 bg-loss/[0.02] overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-loss/15">
          <div className="w-6 h-6 rounded-md bg-loss/10 flex items-center justify-center">
            <AlertTriangle size={13} className="text-loss" />
          </div>
          <p className="text-sm font-semibold text-loss">Danger Zone</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Sign out */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Sign out</p>
              <p className="text-xs text-text-muted mt-0.5">
                End your current session on this device.
              </p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium shrink-0",
                  "bg-surface-2 text-text-secondary border border-border",
                  "hover:bg-surface-3 hover:text-text-primary hover:border-border-hover transition-colors"
                )}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </form>
          </div>

          <div className="border-t border-loss/10" />

          {/* Delete account */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Delete account</p>
              <p className="text-xs text-text-muted mt-0.5">
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <button
              disabled
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium shrink-0",
                "bg-loss/10 text-loss border border-loss/20",
                "opacity-50 cursor-not-allowed"
              )}
            >
              <AlertTriangle size={13} />
              Delete
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-surface-1">
        <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
          <Icon size={13} className="text-accent" />
        </div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-2xs text-text-muted mb-0.5">{label}</p>
        <p className={cn("text-sm text-text-primary truncate", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}

function PlanBadge({ tier }: { tier: string }) {
  const isFree = tier === "free";
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border",
      isFree
        ? "bg-surface-3 text-text-secondary border-border"
        : "bg-accent/10 text-accent border-accent/20"
    )}>
      {tier}
    </span>
  );
}
