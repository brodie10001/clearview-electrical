"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, CompanyFont } from "@/types/database";

type BusinessSettingsUpdate = Database["public"]["Tables"]["business_settings"]["Update"];

export async function updateBusinessSettings(formData: FormData) {
  const supabase = await createClient();

  const values: BusinessSettingsUpdate = {
    trading_name: (formData.get("trading_name") as string) || null,
    abn: (formData.get("abn") as string) || null,
    license_number: (formData.get("license_number") as string) || null,
    primary_color: (formData.get("primary_color") as string) || "#f59e0b",
    secondary_color: (formData.get("secondary_color") as string) || "#0a0a0a",
    accent_color: (formData.get("accent_color") as string) || "#3b82f6",
    email_signature: (formData.get("email_signature") as string) || null,
    quote_header: (formData.get("quote_header") as string) || null,
    invoice_footer: (formData.get("invoice_footer") as string) || null,
    company_font: (formData.get("company_font") as CompanyFont) || "Helvetica",
    default_material_markup_percent: Number(
      formData.get("default_material_markup_percent") || 0,
    ),
    gst_registered: formData.get("gst_registered") === "on",
  };

  const { error } = await supabase.from("business_settings").update(values).eq("id", true);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
  revalidatePath("/finances");
}

export async function createLabourRateType(formData: FormData) {
  const name = formData.get("name") as string;
  const ratePerHour = Number(formData.get("rate_per_hour"));

  const supabase = await createClient();
  const { error } = await supabase.from("labour_rate_types").insert({
    name,
    rate_per_hour: ratePerHour,
    sort_order: 999,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updateLabourRateType(rateTypeId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const ratePerHour = Number(formData.get("rate_per_hour"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("labour_rate_types")
    .update({ name, rate_per_hour: ratePerHour })
    .eq("id", rateTypeId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function toggleLabourRateTypeActive(rateTypeId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("labour_rate_types")
    .update({ is_active: isActive })
    .eq("id", rateTypeId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}
