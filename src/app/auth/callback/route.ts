import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * This route handles the Supabase auth callback.
 * After OAuth sign-in or email confirmation, Supabase redirects here
 * with a `code` query param. We exchange it for a session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect") || "";
  // Only allow same-origin redirects (must start with /, must not start with //)
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(
    `${origin}/auth/login?error=Could+not+authenticate`
  );
}
