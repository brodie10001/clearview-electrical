import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusinessSettingsTabs } from "./business-settings-tabs";
import type { CompanyFont } from "@/types/database";

export interface BusinessSettings {
  trading_name: string | null;
  abn: string | null;
  license_number: string | null;
  logo_url: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_font: CompanyFont;
  email_signature: string | null;
  quote_header: string | null;
  invoice_footer: string | null;
  default_material_markup_percent: number;
  gst_registered: boolean;
}

export interface LabourRateType {
  id: string;
  name: string;
  rate_per_hour: number;
  is_active: boolean;
}

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, settingsRes, rateTypesRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("business_settings").select("*").eq("id", true).single(),
    supabase
      .from("labour_rate_types")
      .select("id, name, rate_per_hour, is_active")
      .order("sort_order")
      .returns<LabourRateType[]>(),
  ]);

  const canEdit = profileRes.data?.role === "owner" || profileRes.data?.role === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/settings"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Settings
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Business Settings
      </h1>

      {settingsRes.data ? (
        <BusinessSettingsTabs
          settings={settingsRes.data}
          rateTypes={rateTypesRes.data ?? []}
          canEdit={canEdit}
        />
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load business settings: {settingsRes.error?.message}
        </p>
      )}
    </div>
  );
}
