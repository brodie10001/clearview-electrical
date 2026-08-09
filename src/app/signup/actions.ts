"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

export async function signUp(
  _prevState: { error: string | null; sent: boolean },
  formData: FormData,
): Promise<{ error: string | null; sent: boolean }> {
  const businessName = (formData.get("business_name") as string)?.trim();
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!businessName) {
    return { error: "Business name is required.", sent: false };
  }
  if (!fullName) {
    return { error: "Your name is required.", sent: false };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, sent: false };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match.", sent: false };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName, full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  // If email confirmation is off, signUp already returns a live session --
  // the business and profile exist immediately, so go straight in instead
  // of telling them to check an email that was never required.
  if (data.session) {
    redirect("/");
  }

  return { error: null, sent: true };
}
