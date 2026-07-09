"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Catches any render-time crash inside the backtest detail view.
 *
 * When a React component type is undefined (import resolution failure,
 * bad re-export, etc.) React throws during reconciliation with the message
 * "undefined is not an object (evaluating 'z.name')".  This boundary
 * catches that error, logs the full component stack to the console for
 * debugging, and shows a human-readable message instead of a blank page.
 */
export class BacktestErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log full component stack so the exact crash location appears in the
    // browser console and in any server-side error monitoring.
    console.error(
      "[BacktestErrorBoundary] render crash\n" +
        "  message: " + error.message + "\n" +
        "  component stack:" + info.componentStack
    );
    this.setState({ componentStack: info.componentStack });
  }

  render() {
    const { error, componentStack } = this.state;

    if (error) {
      return (
        <div className="rounded-2xl border border-loss/20 bg-loss/[0.03] p-6 max-w-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-loss/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-loss" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-loss mb-1">
                Backtest view crashed
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed mb-1">
                A rendering error occurred. The error message below and the full
                component stack have been logged to the browser console.
              </p>
              <p className="text-xs font-mono text-text-muted bg-surface-0 rounded-md px-3 py-2 border border-border break-all">
                {error.message}
              </p>
              {componentStack && (
                <details className="mt-2">
                  <summary className="text-2xs text-text-muted cursor-pointer hover:text-text-secondary">
                    Component stack
                  </summary>
                  <pre className="text-2xs text-text-muted font-mono mt-1 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              this.setState({ error: null, componentStack: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <RefreshCw size={12} />
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
