import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Code2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Strategies",
};

export default async function StrategiesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: strategies } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const items = strategies ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Strategies
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Define and manage your Python trading strategies.
          </p>
        </div>
        <Link href="/dashboard/strategies/new">
          <Button size="sm">
            <Plus size={16} />
            New Strategy
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center mb-4">
            <Code2 className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">
            No strategies created yet
          </p>
          <p className="text-xs text-text-muted max-w-xs mb-5">
            Write your first strategy in Python. We support vectorized and
            event-driven engines.
          </p>
          <Link href="/dashboard/strategies/new">
            <Button size="sm">
              <Plus size={16} />
              Create Strategy
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((strategy) => {
            const lineCount = strategy.code.split("\n").length;

            return (
              <Link
                key={strategy.id}
                href={`/dashboard/strategies/${strategy.id}`}
                className="group"
              >
                <Card className="h-full hover:border-border-hover transition-all duration-150 group-hover:shadow-lg group-hover:shadow-black/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Code2 size={16} className="text-accent" />
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                        {strategy.name}
                      </h3>
                    </div>
                  </div>

                  {strategy.description && (
                    <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
                      {strategy.description}
                    </p>
                  )}

                  <div className="rounded-md bg-surface-0 border border-border p-2.5 mb-3 overflow-hidden">
                    <pre className="text-2xs text-text-muted font-mono leading-relaxed line-clamp-4 whitespace-pre-wrap">
                      {strategy.code.slice(0, 200)}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-2xs text-text-muted">
                    <span className="font-mono">{lineCount} lines</span>
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{formatDateTime(strategy.updated_at)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
