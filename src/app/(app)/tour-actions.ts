"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";

// Fired once, whenever the first-run product tour ends -- whether the user
// finished all steps or hit Skip on any of them. Per-user (profiles.id),
// not per-business: someone invited into an already-onboarded business
// still gets their own one-time tour.
export async function markTourCompleted() {
  const user = await getRequestUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", user.id);
}
