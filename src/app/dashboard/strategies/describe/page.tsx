import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { DescribeStrategyForm } from "@/components/dashboard/describe-strategy-form";

export const metadata: Metadata = { title: "Describe Strategy" };

export default function DescribeStrategyPage() {
  return (
    <div className="max-w-xl space-y-6 animate-fade-in">
      <div>
        <Link
          href="/dashboard/strategies/new"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          Back
        </Link>
        <div className="flex items-center gap-2.5 mb-1">
          <MessageSquare size={16} className="text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-widest">
            Describe &amp; Test
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Describe your strategy
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Write your idea in plain English. The AI interprets it, picks the right
          template, and runs a backtest immediately — no risk profile or timeframe
          to configure.
        </p>
      </div>

      <DescribeStrategyForm />
    </div>
  );
}
