import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusinessSettingsTabs } from "./business-settings-tabs";
import type { CompanyFont, PaymentTerms } from "@/types/database";

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
  quote_terms: string | null;
  invoice_footer: string | null;
  default_material_markup_percent: number;
  gst_registered: boolean;
  default_payment_terms: PaymentTerms;
}

export interface LabourRateType {
  id: string;
  name: string;
  rate_per_hour: number;
  is_active: boolean;
}

export interface GenericMaterialData {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

export interface CatalogueProductData {
  id: string;
  generic_material_id: string;
  brand: string | null;
  product_name: string | null;
  supplier_sku: string | null;
  cost_price: number;
  default_markup_percent: number | null;
  sell_price: number;
  is_preferred: boolean;
  is_custom: boolean;
  active: boolean;
}

export interface PaymentScheduleTemplateData {
  id: string;
  name: string;
}

export interface PaymentScheduleStageData {
  id: string;
  template_id: string;
  label: string;
  percentage: number;
  sort_order: number;
}

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    profileRes,
    settingsRes,
    rateTypesRes,
    materialsRes,
    productsRes,
    templatesRes,
    stagesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("business_settings").select("*").eq("id", true).single(),
    supabase
      .from("labour_rate_types")
      .select("id, name, rate_per_hour, is_active")
      .order("sort_order")
      .returns<LabourRateType[]>(),
    supabase
      .from("generic_materials")
      .select("id, name, category, active")
      .order("category")
      .order("name")
      .returns<GenericMaterialData[]>(),
    supabase
      .from("catalogue_products")
      .select(
        "id, generic_material_id, brand, product_name, supplier_sku, cost_price, default_markup_percent, sell_price, is_preferred, is_custom, active",
      )
      .order("is_preferred", { ascending: false })
      .order("brand")
      .returns<CatalogueProductData[]>(),
    supabase
      .from("payment_schedule_templates")
      .select("id, name")
      .order("name")
      .returns<PaymentScheduleTemplateData[]>(),
    supabase
      .from("payment_schedule_template_stages")
      .select("id, template_id, label, percentage, sort_order")
      .order("sort_order")
      .returns<PaymentScheduleStageData[]>(),
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
          materials={materialsRes.data ?? []}
          products={productsRes.data ?? []}
          paymentScheduleTemplates={templatesRes.data ?? []}
          paymentScheduleStages={stagesRes.data ?? []}
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
