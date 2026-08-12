import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // A signup/reset email's link is only supposed to land on /auth/callback,
  // but Supabase silently falls back to the project's Site URL for any
  // redirect_to that isn't in its Redirect URLs allow-list (e.g. a PR
  // preview origin that was never added there) -- stranding an unused
  // ?code= on whatever page that fallback happens to be. Exchange it here
  // regardless of which path it landed on, so a misconfigured or
  // not-yet-allow-listed redirect target degrades to "still logs you in"
  // instead of a dead code sitting in the address bar.
  const strandedCode = request.nextUrl.searchParams.get("code");
  if (strandedCode && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const { error } = await supabase.auth.exchangeCodeForSession(strandedCode);
    const url = request.nextUrl.clone();
    url.searchParams.delete("code");
    url.pathname = error ? "/forgot-password" : "/";
    if (error) url.searchParams.set("error", "expired");
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  // getClaims() verifies the JWT's signature locally against the project's
  // cached JSON Web Key Set instead of calling the Auth server, IF the
  // project uses asymmetric (ES256/RS256) JWT signing keys -- eliminating a
  // real network round-trip that ran on every single navigation (every page
  // load and every server action, since this middleware runs on all of
  // them). If the project still uses a legacy symmetric signing secret, the
  // SDK itself transparently falls back to a getUser()-equivalent network
  // call, so this is safe to ship ahead of that project setting being
  // changed -- it only gets faster once asymmetric keys are enabled in
  // Supabase Dashboard -> Authentication -> JWT Keys.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims
    ? { id: claimsData.claims.sub, email: claimsData.claims.email ?? null }
    : null;

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  // The public quote/invoice-sharing pages and their PDFs have no login --
  // they do their own authorization via an unguessable token, scoped to a
  // single quote or invoice.
  const isPublicQuoteRoute =
    request.nextUrl.pathname.startsWith("/q/") ||
    request.nextUrl.pathname.startsWith("/api/q/") ||
    request.nextUrl.pathname.startsWith("/i/") ||
    request.nextUrl.pathname.startsWith("/api/i/");
  // Password reset has to work for someone who is, by definition, not
  // signed in: requesting the email and exchanging the emailed link's code
  // for a (recovery) session both happen before any session cookie exists.
  const isPasswordResetRoute =
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/auth/callback");

  if (!user && !isAuthRoute && !isPublicQuoteRoute && !isPasswordResetRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Forward the user this middleware already verified via a request header,
  // so the shared layout and the pages that need identity (Dashboard,
  // Settings) can read it instead of each calling auth.getUser() again --
  // that call revalidates the session against Supabase's Auth server over
  // the network, so doing it 2-3 times per navigation was pure duplicated
  // latency on every single tab switch.
  if (user) {
    const headers = new Headers(request.headers);
    headers.set("x-user-id", user.id);
    if (user.email) headers.set("x-user-email", user.email);

    const response = NextResponse.next({ request: { headers } });
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  return supabaseResponse;
}
