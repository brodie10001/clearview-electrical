import type { SupplierImportTargetField } from "@/types/database";

export type ImportMapping = Partial<Record<SupplierImportTargetField, string>>;

export interface MappedImportRow {
  supplierSku: string | null;
  materialName: string | null;
  costPrice: number | null;
  unit: string | null;
  brand: string | null;
  category: string | null;
  missingRequired: boolean;
}

// Pure row-mapping logic shared between the client-side preview (computed
// instantly from the parsed file, no round trip) and the server-side commit
// action (the actual source of truth for what gets written) -- kept
// dependency-free so it's safe in both a client bundle and a server action.
export function mapImportRow(row: Record<string, string>, mapping: ImportMapping): MappedImportRow {
  const get = (field: SupplierImportTargetField) => {
    const column = mapping[field];
    return column ? (row[column] ?? "").trim() : "";
  };

  const supplierSku = get("supplier_sku") || null;
  const materialName = get("material_name") || null;
  const costRaw = get("cost_price");
  const costPrice = costRaw ? Number(costRaw.replace(/[^0-9.-]/g, "")) : null;
  const unit = get("unit") || null;
  const brand = get("brand") || null;
  const category = get("category") || null;

  const missingRequired =
    !supplierSku || !materialName || costPrice === null || Number.isNaN(costPrice);

  return { supplierSku, materialName, costPrice, unit, brand, category, missingRequired };
}

export interface ExistingSupplierPrice {
  supplierSku: string;
  catalogueProductId: string;
  costPrice: number;
}

export interface ImportSummary {
  total: number;
  matched: number;
  newProducts: number;
  needsReview: number;
  pricesChanged: number;
}

export function summarizeImport(
  rows: MappedImportRow[],
  existingBySku: Map<string, ExistingSupplierPrice>,
): ImportSummary {
  let matched = 0;
  let newProducts = 0;
  let needsReview = 0;
  let pricesChanged = 0;

  for (const row of rows) {
    if (row.missingRequired) {
      needsReview++;
      continue;
    }
    const existing = row.supplierSku ? existingBySku.get(row.supplierSku) : undefined;
    if (existing) {
      matched++;
      if (row.costPrice !== null && row.costPrice !== existing.costPrice) pricesChanged++;
    } else {
      newProducts++;
    }
  }

  return { total: rows.length, matched, newProducts, needsReview, pricesChanged };
}
