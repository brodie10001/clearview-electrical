import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Shared by both ways a signup gets confirmed -- clicking the emailed link
// (auth/callback) and entering the emailed OTP code (signup/actions.ts) --
// so a business that hasn't been through onboarding yet lands there either
// way, instead of only working for one of the two paths.
export async function getPostSignupRedirectPath(supabase: SupabaseServerClient): Promise<string> {
  const { data: business } = await supabase
    .from("businesses")
    .select("onboarding_completed_at")
    .single();
  return business && !business.onboarding_completed_at ? "/onboarding" : "/";
}
