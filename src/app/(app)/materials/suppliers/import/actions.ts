"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePriceListFile, type ParsedFile } from "@/lib/parse-price-list";
import { mapImportRow, type ImportMapping } from "@/lib/price-list-mapping";
import type { SupplierImportTargetField } from "@/types/database";
import type { ExistingSupplierPriceRow } from "./page";

export async function parseUploadedFile(formData: FormData): Promise<ParsedFile> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file uploaded");
  return parsePriceListFile(file);
}

export async function loadSupplierImportContext(supplierId: string): Promise<{
  savedMapping: ImportMapping;
  existingPrices: ExistingSupplierPriceRow[];
}> {
  const supabase = await createClient();

  const [pricesRes, mappingRes] = await Promise.all([
    supabase
      .from("supplier_product_prices")
      .select("supplier_sku, catalogue_product_id, cost_price")
      .eq("supplier_id", supplierId)
      .not("supplier_sku", "is", null)
      .returns<ExistingSupplierPriceRow[]>(),
    supabase
      .from("supplier_import_mappings")
      .select("source_column_name, target_field")
      .eq("supplier_id", supplierId)
      .returns<{ source_column_name: string; target_field: SupplierImportTargetField }[]>(),
  ]);

  return {
    savedMapping: Object.fromEntries(
      (mappingRes.data ?? []).map((m) => [m.target_field, m.source_column_name]),
    ),
    existingPrices: pricesRes.data ?? [],
  };
}

export async function saveImportMapping(supplierId: string, mapping: ImportMapping) {
  const supabase = await createClient();

  const rows = (Object.entries(mapping) as [SupplierImportTargetField, string | undefined][])
    .filter((entry): entry is [SupplierImportTargetField, string] => Boolean(entry[1]))
    .map(([target_field, source_column_name]) => ({
      supplier_id: supplierId,
      target_field,
      source_column_name,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("supplier_import_mappings")
    .upsert(rows, { onConflict: "supplier_id,target_field" });

  if (error) throw new Error(error.message);
}

export interface CommitImportResult {
  matched: number;
  created: number;
  skipped: number;
}

// Applies the mapped rows for real: matches each row to an existing product
// via this supplier's own supplier_sku, updating its price; anything
// unmatched becomes a brand-new generic material + catalogue product (tagged
// for category review) under the business default markup. Never touches
// quotes/invoices/jobs -- those already hold their own point-in-time
// snapshot of cost/markup/sell price, entirely independent of the catalogue.
export async function commitSupplierImport(
  supplierId: string,
  rows: Record<string, string>[],
  mapping: ImportMapping,
): Promise<CommitImportResult> {
  const supabase = await createClient();

  const [existingPricesRes, settingsRes] = await Promise.all([
    supabase
      .from("supplier_product_prices")
      .select("id, supplier_sku, catalogue_product_id, cost_price")
      .eq("supplier_id", supplierId)
      .not("supplier_sku", "is", null)
      .returns<{ id: string; supplier_sku: string; catalogue_product_id: string; cost_price: number }[]>(),
    supabase.from("business_settings").select("default_material_markup_percent").single(),
  ]);

  const existingBySku = new Map(
    (existingPricesRes.data ?? []).map((p) => [p.supplier_sku, p]),
  );
  const defaultMarkup = settingsRes.data?.default_material_markup_percent ?? 30;

  const { data: materials } = await supabase.from("generic_materials").select("id, name");
  const materialIdByName = new Map(
    (materials ?? []).map((m) => [m.name.trim().toLowerCase(), m.id]),
  );

  let matched = 0;
  let created = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const mapped = mapImportRow(row, mapping);
    if (mapped.missingRequired || !mapped.supplierSku) {
      skipped++;
      continue;
    }

    const existing = existingBySku.get(mapped.supplierSku);

    if (existing) {
      const { error } = await supabase
        .from("supplier_product_prices")
        .update({
          cost_price: mapped.costPrice!,
          last_updated: now,
          needs_supplier_review: false,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      matched++;
      continue;
    }

    // New product: find (or create) its generic material, tagging the
    // product for category review whenever the material had to be created
    // fresh rather than confidently matched by name.
    const materialName = mapped.materialName!;
    const materialKey = materialName.trim().toLowerCase();
    let materialId = materialIdByName.get(materialKey);
    let neededNewMaterial = false;

    if (!materialId) {
      const { data: newMaterial, error: materialError } = await supabase
        .from("generic_materials")
        .insert({ name: materialName, category: mapped.category || "Uncategorised" })
        .select("id")
        .single();
      if (materialError) throw new Error(materialError.message);
      materialId = newMaterial.id;
      materialIdByName.set(materialKey, materialId);
      neededNewMaterial = true;
    }

    const costPrice = mapped.costPrice!;
    const sellPrice = Number((costPrice * (1 + defaultMarkup / 100)).toFixed(2));

    const { data: newProduct, error: productError } = await supabase
      .from("catalogue_products")
      .insert({
        generic_material_id: materialId,
        brand: mapped.brand,
        product_name: mapped.materialName,
        cost_price: costPrice,
        sell_price: sellPrice,
        unit: mapped.unit || "each",
        needs_category_review: neededNewMaterial,
      })
      .select("id")
      .single();
    if (productError) throw new Error(productError.message);

    const { error: priceError } = await supabase.from("supplier_product_prices").insert({
      catalogue_product_id: newProduct.id,
      supplier_id: supplierId,
      supplier_sku: mapped.supplierSku,
      cost_price: costPrice,
      is_preferred: true,
      last_updated: now,
    });
    if (priceError) throw new Error(priceError.message);

    existingBySku.set(mapped.supplierSku, {
      id: "",
      supplier_sku: mapped.supplierSku,
      catalogue_product_id: newProduct.id,
      cost_price: costPrice,
    });
    created++;
  }

  revalidatePath("/settings/business");
  revalidatePath("/materials/suppliers");

  return { matched, created, skipped };
}
