import Link from "next/link";
import { Plus, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import type { PropertyType, PropertyStatus } from "@/types/database";

const PAGE_SIZE = 50;

interface PropertyListRow {
  id: string;
  address: string;
  property_type: PropertyType;
  status: string;
  customers: { name: string } | null;
}

const TYPE_STYLES: Record<PropertyType, string> = {
  residential: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  commercial: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  industrial: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const status: PropertyStatus = statusParam === "archived" ? "archived" : "active";
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, address, property_type, status, customers(name)")
    .eq("status", status)
    .order("address")
    .range(from, from + PAGE_SIZE)
    .returns<PropertyListRow[]>();

  const rows = data ?? [];
  const hasNext = rows.length > PAGE_SIZE;
  const properties = rows.slice(0, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Properties
        </h1>
        <Link
          href="/properties/new"
          className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          New Property
        </Link>
      </div>

      <div className="flex gap-1.5">
        {(["active", "archived"] as const).map((s) => (
          <Link
            key={s}
            href={`/properties?status=${s}`}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
              status === s
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      {properties.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          {page > 1 ? "No more properties." : "No properties here yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/properties/${property.id}`}
                className="flex items-center gap-3 bg-white px-4 py-3.5 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <Building2 className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {property.address}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {property.customers?.name ?? "No customer"}
                  </p>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                    TYPE_STYLES[property.property_type],
                  )}
                >
                  {property.property_type}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {page > 1 || hasNext ? (
        <div className="flex items-center justify-between">
          <Link
            href={`/properties?status=${status}&page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium ${
              page <= 1
                ? "pointer-events-none text-neutral-300 dark:text-neutral-700"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
          <Link
            href={`/properties?status=${status}&page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium ${
              !hasNext
                ? "pointer-events-none text-neutral-300 dark:text-neutral-700"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
