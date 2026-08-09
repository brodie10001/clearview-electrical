import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/format";
import type { VisitStatus } from "@/types/database";

const ACTIVE_VISIT_STATUSES: VisitStatus[] = ["Scheduled", "In Progress", "Rescheduled"];

const WINDOWS = [
  { key: "next_job", label: "Next Job" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "3days", label: "Next 3 Days" },
  { key: "7days", label: "Next 7 Days" },
  { key: "custom", label: "Custom Range" },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

interface ShortfallRow {
  catalogueProductId: string;
  label: string;
  unit: string;
  required: number;
  onHand: number;
  shortfall: number;
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function windowRange(
  windowKey: WindowKey,
  today: string,
  customFrom: string | undefined,
  customTo: string | undefined,
): { from: string; to: string } | null {
  switch (windowKey) {
    case "today":
      return { from: today, to: today };
    case "tomorrow": {
      const tomorrow = addDays(today, 1);
      return { from: tomorrow, to: tomorrow };
    }
    case "3days":
      return { from: today, to: addDays(today, 2) };
    case "7days":
      return { from: today, to: addDays(today, 6) };
    case "custom":
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    case "next_job":
      return null;
  }
}

export default async function MaterialsToOrderPage({
  searchParams,
}: PageProps<"/materials/to-order">) {
  const params = await searchParams;
  const windowParam = typeof params.window === "string" ? params.window : "today";
  const windowKey: WindowKey = WINDOWS.some((w) => w.key === windowParam)
    ? (windowParam as WindowKey)
    : "today";
  const customFrom = typeof params.from === "string" ? params.from : undefined;
  const customTo = typeof params.to === "string" ? params.to : undefined;

  const supabase = await createClient();
  const today = todayDateString();

  let jobIds: string[] = [];
  let rangeLabel = "";

  if (windowKey === "next_job") {
    const { data: nextVisit } = await supabase
      .from("job_visits")
      .select("job_id, scheduled_date")
      .in("visit_status", ACTIVE_VISIT_STATUSES)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (nextVisit) {
      jobIds = [nextVisit.job_id];
      rangeLabel = `For the next scheduled job (${nextVisit.scheduled_date})`;
    } else {
      rangeLabel = "No upcoming jobs scheduled";
    }
  } else {
    const range = windowRange(windowKey, today, customFrom, customTo);
    if (range) {
      const { data: visits } = await supabase
        .from("job_visits")
        .select("job_id")
        .in("visit_status", ACTIVE_VISIT_STATUSES)
        .gte("scheduled_date", range.from)
        .lte("scheduled_date", range.to);

      jobIds = Array.from(new Set((visits ?? []).map((v) => v.job_id)));
      rangeLabel =
        range.from === range.to ? `For visits on ${range.from}` : `For visits ${range.from} to ${range.to}`;
    } else {
      rangeLabel = "Choose a date range";
    }
  }

  let shortfalls: ShortfallRow[] = [];

  if (jobIds.length > 0) {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("id")
      .eq("status", "Accepted")
      .in("job_id", jobIds);

    const quoteIds = (quotes ?? []).map((q) => q.id);

    if (quoteIds.length > 0) {
      const { data: lines } = await supabase
        .from("quote_line_items")
        .select("source_catalogue_product_id, quantity")
        .eq("line_type", "material")
        .in("quote_id", quoteIds)
        .not("source_catalogue_product_id", "is", null)
        .returns<{ source_catalogue_product_id: string; quantity: number }[]>();

      const requiredByProduct = new Map<string, number>();
      for (const line of lines ?? []) {
        const id = line.source_catalogue_product_id;
        requiredByProduct.set(id, (requiredByProduct.get(id) ?? 0) + Number(line.quantity));
      }

      const productIds = Array.from(requiredByProduct.keys());

      if (productIds.length > 0) {
        const [productsRes, stockRes] = await Promise.all([
          supabase
            .from("catalogue_products")
            .select("id, brand, product_name, unit, generic_materials(name)")
            .in("id", productIds)
            .returns<
              {
                id: string;
                brand: string | null;
                product_name: string | null;
                unit: string;
                generic_materials: { name: string } | null;
              }[]
            >(),
          supabase
            .from("vehicle_stock")
            .select("catalogue_product_id, quantity_on_hand")
            .in("catalogue_product_id", productIds),
        ]);

        const onHandByProduct = new Map(
          (stockRes.data ?? []).map((s) => [s.catalogue_product_id, s.quantity_on_hand]),
        );
        const productById = new Map((productsRes.data ?? []).map((p) => [p.id, p]));

        shortfalls = productIds
          .map((id) => {
            const product = productById.get(id);
            const required = requiredByProduct.get(id) ?? 0;
            const onHand = onHandByProduct.get(id) ?? 0;
            const productLabel = product
              ? [product.generic_materials?.name, [product.brand, product.product_name].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(" — ")
              : "Unknown product";
            return {
              catalogueProductId: id,
              label: productLabel,
              unit: product?.unit ?? "each",
              required,
              onHand,
              shortfall: required - onHand,
            };
          })
          .filter((row) => row.shortfall > 0)
          .sort((a, b) => b.shortfall - a.shortfall);
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/materials"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Materials
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Materials to Order
      </h1>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {WINDOWS.map((w) => (
          <Link
            key={w.key}
            href={`/materials/to-order?window=${w.key}`}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              windowKey === w.key
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {windowKey === "custom" ? (
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="window" value="custom" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">From</label>
            <input
              name="from"
              type="date"
              defaultValue={customFrom}
              required
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">To</label>
            <input
              name="to"
              type="date"
              defaultValue={customTo}
              required
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Apply
          </button>
        </form>
      ) : null}

      <p className="text-xs text-neutral-500">
        {rangeLabel} · only accepted quotes count, and only the shortfall against current vehicle
        stock is shown.
      </p>

      {shortfalls.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          Nothing needed -- stock already covers what&apos;s quoted for this window.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {shortfalls.map((row) => (
            <li
              key={row.catalogueProductId}
              className="flex items-center justify-between gap-3 bg-white px-4 py-3.5 dark:bg-neutral-900"
            >
              <p className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {row.label}
              </p>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Need {row.shortfall} {row.unit}
                </span>
                <span className="text-xs text-neutral-500">
                  {row.required} required · {row.onHand} on hand
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
