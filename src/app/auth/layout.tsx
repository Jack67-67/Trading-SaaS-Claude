import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex grid-bg">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-10 bg-surface-1 border-r border-border relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <Logo size="lg" />

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary leading-tight">
            Backtest strategies
            <br />
            with institutional
            <br />
            grade infrastructure.
          </h1>
          <p className="text-text-secondary text-base max-w-sm leading-relaxed">
            Define your strategy in Python, run it against years of market data,
            and get production-quality analytics — in minutes.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-text-muted">
          <span>256-bit encryption</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>SOC 2 compliant</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>99.9% uptime</span>
        </div>
      </div>

      {/* Right form area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
