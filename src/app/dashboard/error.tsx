"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error reporting service (e.g. Sentry)
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-loss/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-loss"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          {error.message || "An unexpected error occurred while loading the dashboard."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
          <Button onClick={reset}>Try Again</Button>
        </div>
      </Card>
    </div>
  );
}
