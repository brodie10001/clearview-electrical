"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

export async function resetPassword(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords don't match.";
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return error.message;
  }

  // Require a fresh sign-in with the new password rather than carrying the
  // session forward -- confirms the new password actually works and never
  // leaves a stale recovery session logged in.
  await supabase.auth.signOut();
  redirect("/login?reset=success");
}
