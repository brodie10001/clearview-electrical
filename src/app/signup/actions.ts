"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPostSignupRedirectPath } from "@/lib/auth/post-signup-redirect";

const MIN_PASSWORD_LENGTH = 8;

export interface SignupState {
  error: string | null;
  sent: boolean;
  email: string | null;
}

export async function signUp(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const businessName = (formData.get("business_name") as string)?.trim();
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!businessName) {
    return { error: "Business name is required.", sent: false, email: null };
  }
  if (!fullName) {
    return { error: "Your name is required.", sent: false, email: null };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      sent: false,
      email: null,
    };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match.", sent: false, email: null };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName, full_name: fullName },
      // The emailed link still works for anyone who clicks it in the same
      // browser they signed up with -- the OTP code (entered below) exists
      // specifically for the cross-browser/cross-device case a link can't
      // handle, not as a replacement for it.
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error) {
    return { error: error.message, sent: false, email: null };
  }

  // If email confirmation is off, signUp already returns a live session --
  // the business and profile exist immediately, so go straight in instead
  // of telling them to check an email that was never required.
  if (data.session) {
    redirect("/");
  }

  return { error: null, sent: true, email };
}

export interface VerifyOtpState {
  error: string | null;
}

// Confirming via a typed code instead of the emailed link: verifyOtp only
// needs the email + code pair, not a code_verifier cookie from the
// browser that started the signup -- so unlike the link, this works no
// matter which device or browser the code is entered on.
export async function verifySignupOtp(
  _prevState: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = formData.get("email") as string;
  const token = (formData.get("token") as string)?.trim();

  if (!token) {
    return { error: "Enter the code from your email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return { error: "That code is invalid or has expired. Request a new one below." };
  }

  redirect(await getPostSignupRedirectPath(supabase));
}

export interface ResendState {
  sent: boolean;
}

// Sends a fresh confirmation email (both the link and the OTP code) for an
// address that's already signed up but not yet confirmed.
export async function resendSignupOtp(
  _prevState: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = formData.get("email") as string;
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/` },
  });
  return { sent: true };
}
