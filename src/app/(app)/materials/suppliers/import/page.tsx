import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./import-wizard";
import type { SupplierImportTargetField } from "@/types/database";

export interface ImportSupplierOption {
  id: string;
  name: string;
}

export interface ExistingSupplierPriceRow {
  supplier_sku: string;
  catalogue_product_id: string;
  cost_price: number;
}

export default async function SupplierImportPage({
  searchParams,
}: PageProps<"/materials/suppliers/import">) {
  const { supplier_id: supplierIdParam } = await searchParams;
  const supplierId = typeof supplierIdParam === "string" ? supplierIdParam : undefined;

  const supabase = await createClient();

  const [suppliersRes, settingsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase
      .from("business_settings")
      .select("default_material_markup_percent")
      .single(),
  ]);

  let existingPrices: ExistingSupplierPriceRow[] = [];
  let savedMapping: Partial<Record<SupplierImportTargetField, string>> = {};

  if (supplierId) {
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

    existingPrices = pricesRes.data ?? [];
    savedMapping = Object.fromEntries(
      (mappingRes.data ?? []).map((m) => [m.target_field, m.source_column_name]),
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/settings/business"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Business Settings
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Import Supplier Price List
      </h1>

      <ImportWizard
        suppliers={suppliersRes.data ?? []}
        initialSupplierId={supplierId}
        savedMapping={savedMapping}
        existingPrices={existingPrices}
        defaultMarkupPercent={settingsRes.data?.default_material_markup_percent ?? 30}
      />
    </div>
  );
}
