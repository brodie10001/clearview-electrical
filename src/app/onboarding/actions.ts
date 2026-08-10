"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompanyFont, PaymentTerms } from "@/types/database";

export interface OnboardingStepResult {
  error: string | null;
}

// Each step below writes only the columns it owns -- never the whole
// business_settings row -- so an earlier or later step's already-saved
// values (or the row's real defaults) are never clobbered by a step that
// doesn't know about them.

export async function updateOnboardingIdentity(
  _prevState: OnboardingStepResult,
  formData: FormData,
): Promise<OnboardingStepResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({
      trading_name: (formData.get("trading_name") as string) || null,
      abn: (formData.get("abn") as string) || null,
      license_number: (formData.get("license_number") as string) || null,
      business_email: (formData.get("business_email") as string) || null,
      business_phone: (formData.get("business_phone") as string) || null,
      business_address: (formData.get("business_address") as string) || null,
    });

  if (error) return { error: error.message };
  revalidatePath("/onboarding");
  return { error: null };
}

export async function updateOnboardingBranding(
  _prevState: OnboardingStepResult,
  formData: FormData,
): Promise<OnboardingStepResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").update({
    primary_color: (formData.get("primary_color") as string) || "#f59e0b",
    secondary_color: (formData.get("secondary_color") as string) || "#0a0a0a",
    accent_color: (formData.get("accent_color") as string) || "#3b82f6",
    company_font: (formData.get("company_font") as CompanyFont) || "Helvetica",
  });

  if (error) return { error: error.message };
  revalidatePath("/onboarding");
  return { error: null };
}

export async function updateOnboardingTaxPricing(
  _prevState: OnboardingStepResult,
  formData: FormData,
): Promise<OnboardingStepResult> {
  const standardRateTypeId = formData.get("standard_rate_type_id") as string;
  const ratePerHour = Number(formData.get("standard_rate_per_hour") || 0);

  if (!Number.isFinite(ratePerHour) || ratePerHour < 0) {
    return { error: "Hourly rate must be zero or more." };
  }

  const supabase = await createClient();

  const { error: settingsError } = await supabase.from("business_settings").update({
    gst_registered: formData.get("gst_registered") === "on",
    default_material_markup_percent: Number(formData.get("default_material_markup_percent") || 0),
  });
  if (settingsError) return { error: settingsError.message };

  if (standardRateTypeId) {
    const { error: rateError } = await supabase
      .from("labour_rate_types")
      .update({ rate_per_hour: ratePerHour })
      .eq("id", standardRateTypeId);
    if (rateError) return { error: rateError.message };
  }

  revalidatePath("/onboarding");
  return { error: null };
}

export async function updateOnboardingQuoteInvoiceDefaults(
  _prevState: OnboardingStepResult,
  formData: FormData,
): Promise<OnboardingStepResult> {
  const validityRaw = formData.get("default_quote_validity_days") as string;
  const validityDays = validityRaw ? Number(validityRaw) : null;

  if (validityDays !== null && (!Number.isFinite(validityDays) || validityDays < 1)) {
    return { error: "Quote validity must be at least 1 day, or left blank." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").update({
    default_quote_validity_days: validityDays,
    default_payment_terms: (formData.get("default_payment_terms") as PaymentTerms) || "7 days",
  });

  if (error) return { error: error.message };
  revalidatePath("/onboarding");
  return { error: null };
}

export async function updateOnboardingPaymentDetails(
  _prevState: OnboardingStepResult,
  formData: FormData,
): Promise<OnboardingStepResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").update({
    bank_bsb: (formData.get("bank_bsb") as string) || null,
    bank_account_name: (formData.get("bank_account_name") as string) || null,
    bank_account_number: (formData.get("bank_account_number") as string) || null,
    payment_instructions: (formData.get("payment_instructions") as string) || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/onboarding");
  return { error: null };
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ onboarding_completed_at: new Date().toISOString() });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/");
}

// Skipping never sets onboarding_completed_at -- whatever's already been
// saved in earlier steps stays saved, everything else keeps its default.
// The Dashboard banner (shown whenever onboarding_completed_at is still
// null) is the only remaining prompt after this.
export async function skipOnboarding() {
  redirect("/");
}
