import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Admin Supabase client for server-side use cases that need to bypass RLS.
 * Requires SUPABASE_SERVICE_ROLE_KEY in env for public data access.
 * Falls back to anon key (respects RLS) if service role key is not set.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
