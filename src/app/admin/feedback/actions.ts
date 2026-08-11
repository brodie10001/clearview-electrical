"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackStatus } from "@/types/database";

// Gated by RLS ("platform admins can triage feedback") -- a non-admin
// calling this directly would silently update zero rows, not another
// business's feedback, since is_platform_admin() is the only thing this
// policy checks.
export async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").update({ status }).eq("id", feedbackId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/feedback");
}
