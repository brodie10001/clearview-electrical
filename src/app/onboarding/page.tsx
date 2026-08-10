import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";
import type { CompanyFont, PaymentTerms } from "@/types/database";

export interface OnboardingSettings {
  trading_name: string | null;
  abn: string | null;
  license_number: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_font: CompanyFont;
  gst_registered: boolean;
  default_material_markup_percent: number;
  default_quote_validity_days: number | null;
  default_payment_terms: PaymentTerms;
  quote_number_prefix: string;
  quote_number_next: number;
  invoice_number_prefix: string;
  invoice_number_next: number;
  bank_bsb: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  payment_instructions: string | null;
}

export default async function OnboardingPage() {
  const supabase = await createClient();

  const [businessRes, settingsRes, rateRes] = await Promise.all([
    supabase.from("businesses").select("name, onboarding_completed_at").single(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, business_email, business_phone, business_address, logo_url, primary_color, secondary_color, accent_color, company_font, gst_registered, default_material_markup_percent, default_quote_validity_days, default_payment_terms, quote_number_prefix, quote_number_next, invoice_number_prefix, invoice_number_next, bank_bsb, bank_account_name, bank_account_number, payment_instructions",
      )
      .single()
      .returns<OnboardingSettings>(),
    supabase
      .from("labour_rate_types")
      .select("id, rate_per_hour")
      .eq("name", "Standard")
      .single(),
  ]);

  // Already done -- either they finished it in another tab, or navigated
  // back here manually after completing/being exempted. Nothing to do.
  if (businessRes.data?.onboarding_completed_at) {
    redirect("/");
  }

  if (!settingsRes.data) {
    redirect("/");
  }

  // Trading name isn't collected at signup itself, but the business name
  // typed into the signup form is a reasonable starting point if nothing's
  // been set yet.
  const settings: OnboardingSettings = {
    ...settingsRes.data,
    trading_name: settingsRes.data.trading_name || businessRes.data?.name || null,
  };

  return (
    <OnboardingWizard
      settings={settings}
      standardRateTypeId={rateRes.data?.id ?? null}
      standardRatePerHour={rateRes.data?.rate_per_hour ?? 0}
    />
  );
}
