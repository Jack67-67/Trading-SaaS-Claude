import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 grid-bg">
      <Logo size="lg" className="mb-12" />
      <div className="text-center max-w-sm">
        <p className="text-7xl font-bold font-mono text-surface-4 mb-4">404</p>
        <h1 className="text-xl font-semibold text-text-primary mb-2">
          Page not found
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
