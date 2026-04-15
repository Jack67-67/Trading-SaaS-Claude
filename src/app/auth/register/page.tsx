"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="animate-fade-in text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-profit/10 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-profit" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="text-text-primary font-medium">{email}</span>.
            <br />
            Click it to activate your account.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
          <Mail size={14} className="text-accent shrink-0" />
          Didn&apos;t receive it? Check your spam folder.
        </div>
        <Link
          href="/auth/login"
          className="block text-sm text-accent hover:text-accent-hover font-medium transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  // ── Register form ─────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Create your account
        </h2>
        <p className="text-sm text-text-muted mt-1.5">
          Test your strategies before risking real money. Free to start.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-loss/10 border border-loss/20 text-sm text-loss">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          hint="Minimum 8 characters"
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full mt-1">
          Create Account
        </Button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
