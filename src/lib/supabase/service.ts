import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Server-only, bypasses RLS entirely -- never import this from a Client
// Component or anywhere the bundle reaches the browser. Reserved for the
// public /q/[token] quote-sharing routes, which do their own authorization
// (validate the unguessable token, then only ever query the single matching
// quote_id) since an anonymous visitor has no Supabase auth session for RLS
// to key off.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
