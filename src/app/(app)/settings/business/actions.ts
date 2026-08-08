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

export async function createGenericMaterial(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("generic_materials").insert({ name, category });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function toggleGenericMaterialActive(materialId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("generic_materials")
    .update({ active })
    .eq("id", materialId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

function catalogueProductValues(formData: FormData) {
  const markupRaw = formData.get("default_markup_percent") as string;
  return {
    brand: (formData.get("brand") as string) || null,
    product_name: (formData.get("product_name") as string) || null,
    supplier_sku: (formData.get("supplier_sku") as string) || null,
    cost_price: Number(formData.get("cost_price") || 0),
    default_markup_percent: markupRaw ? Number(markupRaw) : null,
    sell_price: Number(formData.get("sell_price") || 0),
  };
}

export async function createCatalogueProduct(genericMaterialId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogue_products").insert({
    generic_material_id: genericMaterialId,
    is_custom: formData.get("is_custom") === "on",
    ...catalogueProductValues(formData),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updateCatalogueProduct(productId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalogue_products")
    .update(catalogueProductValues(formData))
    .eq("id", productId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

// Only one product per generic material can be preferred (enforced by a
// partial unique index) -- clear the previous one first so this never
// conflicts.
export async function setPreferredCatalogueProduct(genericMaterialId: string, productId: string) {
  const supabase = await createClient();
  await supabase
    .from("catalogue_products")
    .update({ is_preferred: false })
    .eq("generic_material_id", genericMaterialId)
    .eq("is_preferred", true);

  const { error } = await supabase
    .from("catalogue_products")
    .update({ is_preferred: true })
    .eq("id", productId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function toggleCatalogueProductActive(productId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalogue_products")
    .update({ active })
    .eq("id", productId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}
