import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VehicleStockList } from "./vehicle-stock-list";

export interface VehicleStockProductRow {
  id: string;
  brand: string | null;
  product_name: string | null;
  unit: string;
  category: string;
  quantity_on_hand: number;
  minimum_stock_level: number;
}

export default async function VehicleStockPage() {
  const supabase = await createClient();

  const [productsRes, stockRes] = await Promise.all([
    supabase
      .from("catalogue_products")
      .select("id, brand, product_name, unit, generic_materials(category)")
      .eq("active", true)
      .returns<
        {
          id: string;
          brand: string | null;
          product_name: string | null;
          unit: string;
          generic_materials: { category: string } | null;
        }[]
      >(),
    supabase.from("vehicle_stock").select("catalogue_product_id, quantity_on_hand, minimum_stock_level"),
  ]);

  const stockByProduct = new Map(
    (stockRes.data ?? []).map((s) => [
      s.catalogue_product_id,
      { quantity_on_hand: s.quantity_on_hand, minimum_stock_level: s.minimum_stock_level },
    ]),
  );

  const products: VehicleStockProductRow[] = (productsRes.data ?? [])
    .map((p) => {
      const stock = stockByProduct.get(p.id);
      return {
        id: p.id,
        brand: p.brand,
        product_name: p.product_name,
        unit: p.unit,
        category: p.generic_materials?.category ?? "Other",
        quantity_on_hand: stock?.quantity_on_hand ?? 0,
        minimum_stock_level: stock?.minimum_stock_level ?? 0,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/materials"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Materials
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Vehicle Stock
      </h1>
      <p className="text-sm text-neutral-500">
        Track what&apos;s on the van. Stock is managed manually here -- job completion never
        auto-deducts it.
      </p>

      <VehicleStockList products={products} />
    </div>
  );
}
