"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(
  _prevState: { sent: boolean; error: string | null },
  formData: FormData,
): Promise<{ sent: boolean; error: string | null }> {
  const email = formData.get("email") as string;
  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Never reveal whether the email is registered -- same success state
  // either way, so this can't be used to enumerate accounts.
  if (error) {
    return { sent: false, error: error.message };
  }

  return { sent: true, error: null };
}
