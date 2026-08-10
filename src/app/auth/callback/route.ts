import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where password reset, signup confirmation (and, if added later, any
// other emailed-link auth flow) lands: exchanges the PKCE code Supabase put
// in the link for a real session, then hands off to `next`. A failed
// exchange means the link was already used or has expired -- send them
// back to request a fresh one rather than leaving them stuck on a broken
// link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // next === "/" only happens for the signup-confirmation flow (see
      // signup/actions.ts) -- password reset always sets next to
      // /reset-password. That's the one moment to route into the
      // onboarding wizard instead of the Dashboard: a business that
      // hasn't been through it yet has onboarding_completed_at = null.
      // Every other landing on "/" afterwards (a plain login, or coming
      // back after skipping) goes straight to the Dashboard as normal.
      if (next === "/") {
        const { data: business } = await supabase
          .from("businesses")
          .select("onboarding_completed_at")
          .single();
        if (business && !business.onboarding_completed_at) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
}
