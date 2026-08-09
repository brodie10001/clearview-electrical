import { headers } from "next/headers";

// Middleware (src/lib/supabase/middleware.ts) already verifies the session
// against Supabase's Auth server once per request and forwards the result
// via request headers -- read that here instead of calling
// supabase.auth.getUser() again, which would repeat the same network
// round-trip for no reason. Every route under (app) is only ever reached
// after middleware has confirmed a user, so this is never null there.
export async function getRequestUser(): Promise<{ id: string; email: string | null } | null> {
  const headersList = await headers();
  const id = headersList.get("x-user-id");
  if (!id) return null;
  return { id, email: headersList.get("x-user-email") };
}
