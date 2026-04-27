import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // ── Canonical redirect: www → non-www ─────────────────────────────────────
  // Ensures auth cookies are scoped to one consistent domain.
  // Both zlugo.com and www.zlugo.com point to Vercel, so we pick one canonical.
  if (host.startsWith("www.")) {
    const canonical = host.slice(4); // strip "www."
    const url = request.nextUrl.clone();
    url.host = canonical;
    return NextResponse.redirect(url, { status: 301 });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder static assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
