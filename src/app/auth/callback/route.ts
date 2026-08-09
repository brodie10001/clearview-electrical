import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where password reset (and, if added later, any other emailed-link auth
// flow) lands: exchanges the PKCE code Supabase put in the link for a real
// session, then hands off to `next`. A failed exchange means the link was
// already used or has expired -- send them back to request a fresh one
// rather than leaving them stuck on a broken link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
}
