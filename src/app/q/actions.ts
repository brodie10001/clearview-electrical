"use server";

import { createServiceClient } from "@/lib/supabase/service";

// Called from the public quote page's client-side view tracker, which
// checks sessionStorage first so this only fires once per browser session.
// Uses the service client since an anonymous visitor has no Supabase auth
// session -- the token is the only thing authorizing this write, and it
// only ever touches quote_activity for the one quote that token resolves
// to.
export async function logQuoteViewed(token: string) {
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("quote_public_tokens")
    .select("quote_id")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) return;

  await supabase
    .from("quote_activity")
    .insert({ quote_id: tokenRow.quote_id, event_type: "Viewed" });
}
