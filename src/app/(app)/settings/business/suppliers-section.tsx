"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { createSupplier, toggleSupplierActive } from "./actions";
import type { SupplierData } from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function SuppliersSection({
  suppliers,
  canEdit,
}: {
  suppliers: SupplierData[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        Suppliers each price catalogue products independently -- mark one price per product as
        preferred to feed the product&apos;s cost price. Import a supplier&apos;s price list from
        Excel or CSV to update many at once.
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {suppliers.map((supplier) => (
          <li key={supplier.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {supplier.name}
              {!supplier.active ? (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                  Inactive
                </span>
              ) : null}
            </span>
            {canEdit ? (
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/materials/suppliers/import?supplier_id=${supplier.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700"
                >
                  <Upload className="h-3.5 w-3.5" /> Import price list
                </Link>
                <button
                  onClick={() => toggleSupplierActive(supplier.id, !supplier.active)}
                  className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  {supplier.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        adding ? (
          <form
            action={async (formData) => {
              setError(null);
              try {
                await createSupplier(formData);
                setAdding(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to add supplier");
              }
            }}
            className="flex items-end gap-2"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Supplier name</label>
              <input name="name" required placeholder="e.g. Ideal Electrical" className={inputClass} />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add supplier
          </button>
        )
      ) : null}
    </div>
  );
}
