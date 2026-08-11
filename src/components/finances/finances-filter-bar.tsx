"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import type { DateFilterKey } from "@/lib/finances";

const FILTERS: { label: string; value: DateFilterKey }[] = [
  { label: "This Month", value: "this-month" },
  { label: "Last Month", value: "last-month" },
  { label: "This FY", value: "fy" },
  { label: "All Time", value: "all-time" },
  { label: "Custom", value: "custom" },
];

export function FinancesFilterBar({
  filter,
  from,
  to,
}: {
  filter: DateFilterKey;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(value: DateFilterKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/finances?${params.toString()}`);
  }

  function setCustomDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", "custom");
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/finances?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from ?? ""}
            onChange={(e) => setCustomDate("from", e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <span className="text-sm text-neutral-500">to</span>
          <input
            type="date"
            value={to ?? ""}
            onChange={(e) => setCustomDate("to", e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>
      ) : null}
    </div>
  );
}
