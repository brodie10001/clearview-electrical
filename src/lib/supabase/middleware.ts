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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  // The public quote-sharing page and its PDF have no login -- they do their
  // own authorization via an unguessable token, scoped to a single quote.
  const isPublicQuoteRoute =
    request.nextUrl.pathname.startsWith("/q/") ||
    request.nextUrl.pathname.startsWith("/api/q/");
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
