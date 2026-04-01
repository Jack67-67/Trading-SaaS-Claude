import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Email
              </p>
              <p className="text-sm text-text-primary font-mono">
                {user?.email}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Full Name
              </p>
              <p className="text-sm text-text-primary">
                {profile?.full_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Plan
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent capitalize">
                {profile?.subscription_tier || "free"}
              </span>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Member Since
              </p>
              <p className="text-sm text-text-primary">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* API Key section */}
      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
        </CardHeader>
        <p className="text-sm text-text-secondary mb-4">
          Use your Supabase JWT to authenticate with the backtest API. The token
          is automatically included in requests from this dashboard.
        </p>
        <div className="p-3 rounded-lg bg-surface-2 border border-border">
          <p className="text-xs text-text-muted mb-1">Backtest API Endpoint</p>
          <code className="text-sm text-accent font-mono">
            {process.env.NEXT_PUBLIC_BACKTEST_API_URL || "http://localhost:8000"}
            /api/v1
          </code>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-loss/20">
        <CardHeader>
          <CardTitle className="text-loss">Danger Zone</CardTitle>
        </CardHeader>
        <p className="text-sm text-text-secondary mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <button
          className="h-9 px-4 rounded-lg text-sm font-medium bg-loss/10 text-loss border border-loss/20 hover:bg-loss/20 transition-colors"
          disabled
        >
          Delete Account
        </button>
      </Card>
    </div>
  );
}
