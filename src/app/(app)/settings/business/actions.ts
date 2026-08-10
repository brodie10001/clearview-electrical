"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, CompanyFont, PaymentTerms, ComplianceFieldDef } from "@/types/database";

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
    quote_terms: (formData.get("quote_terms") as string) || null,
    invoice_footer: (formData.get("invoice_footer") as string) || null,
    company_font: (formData.get("company_font") as CompanyFont) || "Helvetica",
    default_material_markup_percent: Number(
      formData.get("default_material_markup_percent") || 0,
    ),
    gst_registered: formData.get("gst_registered") === "on",
    default_payment_terms: (formData.get("default_payment_terms") as PaymentTerms) || "7 days",
  };

  const { error } = await supabase.from("business_settings").update(values);

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
    cost_price: Number(formData.get("cost_price") || 0),
    default_markup_percent: markupRaw ? Number(markupRaw) : null,
    sell_price: Number(formData.get("sell_price") || 0),
    unit: (formData.get("unit") as string) || "each",
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

export async function dismissCategoryReview(productId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalogue_products")
    .update({ needs_category_review: false })
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

export async function createSupplier(formData: FormData) {
  const name = formData.get("name") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({ name });

  if (error) {
    // Postgres unique_violation -- most likely this supplier already exists
    // (e.g. "MM Electrical", seeded by the V6 migration) rather than a real
    // failure, so say that plainly instead of surfacing a raw DB message.
    if (error.code === "23505") {
      throw new Error(`A supplier named "${name}" already exists.`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/settings/business");
}

export async function toggleSupplierActive(supplierId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({ active }).eq("id", supplierId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

// Adds or updates this supplier's price for a product (one row per
// product+supplier, enforced by a unique index) -- editing an existing price
// just bumps last_updated and cost_price in place rather than adding a
// duplicate row. Clears needs_supplier_review since a human just confirmed
// this row directly.
export async function upsertSupplierProductPrice(
  catalogueProductId: string,
  formData: FormData,
) {
  const supplierId = formData.get("supplier_id") as string;
  const supplierSku = (formData.get("supplier_sku") as string) || null;
  const costPrice = Number(formData.get("cost_price") || 0);

  const supabase = await createClient();
  const { error } = await supabase.from("supplier_product_prices").upsert(
    {
      catalogue_product_id: catalogueProductId,
      supplier_id: supplierId,
      supplier_sku: supplierSku,
      cost_price: costPrice,
      needs_supplier_review: false,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "catalogue_product_id,supplier_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

// Only one supplier price per product can be preferred (enforced by a
// partial unique index, same pattern as setPreferredCatalogueProduct) --
// clear the previous one first so this never conflicts. Setting the new row
// preferred fires the cost-sync trigger, updating the product's cached
// cost_price/sell_price.
export async function setPreferredSupplierPrice(catalogueProductId: string, priceId: string) {
  const supabase = await createClient();
  await supabase
    .from("supplier_product_prices")
    .update({ is_preferred: false })
    .eq("catalogue_product_id", catalogueProductId)
    .eq("is_preferred", true);

  const { error } = await supabase
    .from("supplier_product_prices")
    .update({ is_preferred: true })
    .eq("id", priceId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function dismissSupplierPriceReview(priceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("supplier_product_prices")
    .update({ needs_supplier_review: false })
    .eq("id", priceId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function createPaymentScheduleTemplate(formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();
  const { error } = await supabase.from("payment_schedule_templates").insert({ name });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function renamePaymentScheduleTemplate(templateId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_schedule_templates")
    .update({ name })
    .eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function deletePaymentScheduleTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payment_schedule_templates").delete().eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function addTemplateStage(templateId: string, formData: FormData) {
  const label = formData.get("label") as string;
  const percentage = Number(formData.get("percentage"));

  const supabase = await createClient();
  const { count } = await supabase
    .from("payment_schedule_template_stages")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const { error } = await supabase.from("payment_schedule_template_stages").insert({
    template_id: templateId,
    label,
    percentage,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updateTemplateStage(stageId: string, formData: FormData) {
  const label = formData.get("label") as string;
  const percentage = Number(formData.get("percentage"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_schedule_template_stages")
    .update({ label, percentage })
    .eq("id", stageId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function deleteTemplateStage(stageId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payment_schedule_template_stages").delete().eq("id", stageId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function createTestType(formData: FormData) {
  const name = formData.get("name") as string;
  const defaultUnit = (formData.get("default_unit") as string) || null;
  const isCustom = formData.get("is_custom") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("test_types")
    .insert({ name, default_unit: defaultUnit, is_custom: isCustom });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updateTestType(testTypeId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const defaultUnit = (formData.get("default_unit") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("test_types")
    .update({ name, default_unit: defaultUnit })
    .eq("id", testTypeId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function toggleTestTypeActive(testTypeId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("test_types").update({ active }).eq("id", testTypeId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

function parseFieldSchema(formData: FormData): ComplianceFieldDef[] {
  const raw = formData.get("field_schema") as string;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ComplianceFieldDef[];
  } catch {
    throw new Error("Invalid field schema");
  }
}

export async function createComplianceDocumentTemplate(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const fieldSchema = parseFieldSchema(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_document_templates")
    .insert({ name, category, field_schema: fieldSchema });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updateComplianceDocumentTemplate(templateId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const fieldSchema = parseFieldSchema(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_document_templates")
    .update({ name, category, field_schema: fieldSchema })
    .eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function toggleComplianceDocumentTemplateActive(templateId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_document_templates")
    .update({ active })
    .eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

function priceBookItemValues(formData: FormData) {
  const labourHoursRaw = formData.get("labour_allowance_hours") as string;
  const consumablesRaw = formData.get("consumables_allowance") as string;
  return {
    name: formData.get("name") as string,
    customer_facing_description: formData.get("customer_facing_description") as string,
    category: formData.get("category") as string,
    default_sell_price: Number(formData.get("default_sell_price") || 0),
    labour_allowance_hours: labourHoursRaw ? Number(labourHoursRaw) : null,
    labour_rate_type_id: (formData.get("labour_rate_type_id") as string) || null,
    consumables_allowance: consumablesRaw ? Number(consumablesRaw) : null,
  };
}

export async function createPriceBookItem(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("price_book_items").insert(priceBookItemValues(formData));

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updatePriceBookItem(itemId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("price_book_items")
    .update(priceBookItemValues(formData))
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function togglePriceBookItemActive(itemId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("price_book_items").update({ active }).eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function addPriceBookItemMaterial(itemId: string, formData: FormData) {
  const catalogueProductId = formData.get("catalogue_product_id") as string;
  const quantity = Number(formData.get("quantity") || 1);

  const supabase = await createClient();
  const { error } = await supabase.from("price_book_item_materials").insert({
    price_book_item_id: itemId,
    catalogue_product_id: catalogueProductId,
    quantity,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function updatePriceBookItemMaterialQuantity(linkId: string, quantity: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("price_book_item_materials")
    .update({ quantity })
    .eq("id", linkId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function removePriceBookItemMaterial(linkId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("price_book_item_materials").delete().eq("id", linkId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}
