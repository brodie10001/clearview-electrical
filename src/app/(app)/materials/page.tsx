import Link from "next/link";
import { Truck, ClipboardList, Package2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function MaterialsPage() {
  const supabase = await createClient();

  const [stockRes, suppliersRes, reviewRes] = await Promise.all([
    supabase.from("vehicle_stock").select("quantity_on_hand, minimum_stock_level"),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("supplier_product_prices")
      .select("id", { count: "exact", head: true })
      .eq("needs_supplier_review", true),
  ]);

  const lowStockCount = (stockRes.data ?? []).filter(
    (s) => s.quantity_on_hand < s.minimum_stock_level,
  ).length;
  const supplierCount = suppliersRes.count ?? 0;
  const reviewCount = reviewRes.count ?? 0;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Materials</h1>

      <Link
        href="/materials/vehicle-stock"
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Truck className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Vehicle Stock
          </h3>
          <p className="text-sm text-neutral-500">
            {lowStockCount > 0
              ? `${lowStockCount} item${lowStockCount === 1 ? "" : "s"} below minimum`
              : "All stock levels healthy"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </Link>

      <Link
        href="/materials/to-order"
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <ClipboardList className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Materials to Order
          </h3>
          <p className="text-sm text-neutral-500">
            What&apos;s short for upcoming accepted work
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </Link>

      <Link
        href="/settings/business"
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Package2 className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Suppliers &amp; Pricing
          </h3>
          <p className="text-sm text-neutral-500">
            {supplierCount} supplier{supplierCount === 1 ? "" : "s"}
            {reviewCount > 0 ? ` · ${reviewCount} price${reviewCount === 1 ? "" : "s"} to review` : ""}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </Link>
    </div>
  );
}
