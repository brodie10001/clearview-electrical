"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { addStock, removeStock, restockItem, adjustStock, setMinimumStockLevel } from "./actions";
import type { VehicleStockProductRow } from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function productLabel(product: VehicleStockProductRow) {
  return [product.brand, product.product_name].filter(Boolean).join(" ") || "Unnamed product";
}

export function VehicleStockList({ products }: { products: VehicleStockProductRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, VehicleStockProductRow[]>();
    for (const p of products) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [products]);

  const lowStockCount = products.filter((p) => p.quantity_on_hand < p.minimum_stock_level).length;

  return (
    <div className="flex flex-col gap-5">
      {lowStockCount > 0 ? (
        <p className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" /> {lowStockCount} item
          {lowStockCount === 1 ? "" : "s"} below minimum stock level
        </p>
      ) : null}

      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {category}
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {(byCategory.get(category) ?? []).map((product) => {
              const expanded = expandedId === product.id;
              const lowStock = product.quantity_on_hand < product.minimum_stock_level;
              return (
                <li key={product.id} className="flex flex-col">
                  <button
                    onClick={() => setExpandedId(expanded ? null : product.id)}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      )}
                      <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {productLabel(product)}
                      </span>
                      {lowStock ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5" /> Low
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm text-neutral-500">
                      {product.quantity_on_hand} {product.unit}
                      {product.minimum_stock_level > 0 ? ` / min ${product.minimum_stock_level}` : ""}
                    </span>
                  </button>

                  {expanded ? (
                    <StockActions product={product} onDone={() => setExpandedId(null)} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

type ActionKind = "add" | "remove" | "restock" | "adjust" | "minimum" | null;

function StockActions({
  product,
  onDone,
}: {
  product: VehicleStockProductRow;
  onDone: () => void;
}) {
  const [action, setAction] = useState<ActionKind>(null);

  const buttons: { key: ActionKind; label: string }[] = [
    { key: "add", label: "Add" },
    { key: "remove", label: "Remove" },
    { key: "restock", label: "Restock" },
    { key: "adjust", label: "Adjust" },
    { key: "minimum", label: "Set minimum" },
  ];

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
      <div className="flex flex-wrap gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.key}
            onClick={() => setAction(action === b.key ? null : b.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              action === b.key
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      {action === "add" ? (
        <QuantityForm
          label="Quantity to add"
          submitLabel="Add stock"
          onSubmit={async (formData) => {
            await addStock(product.id, formData);
            onDone();
          }}
        />
      ) : null}
      {action === "remove" ? (
        <QuantityForm
          label="Quantity to remove"
          submitLabel="Remove stock"
          onSubmit={async (formData) => {
            await removeStock(product.id, formData);
            onDone();
          }}
        />
      ) : null}
      {action === "restock" ? (
        <QuantityForm
          label="Quantity restocked"
          submitLabel="Log restock"
          onSubmit={async (formData) => {
            await restockItem(product.id, formData);
            onDone();
          }}
        />
      ) : null}
      {action === "adjust" ? (
        <QuantityForm
          label="New quantity on hand"
          submitLabel="Set quantity"
          defaultValue={product.quantity_on_hand}
          onSubmit={async (formData) => {
            await adjustStock(product.id, formData);
            onDone();
          }}
        />
      ) : null}
      {action === "minimum" ? (
        <form
          action={async (formData) => {
            await setMinimumStockLevel(product.id, formData);
            onDone();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Minimum stock level</label>
            <input
              name="minimum_stock_level"
              type="number"
              step="1"
              min="0"
              defaultValue={product.minimum_stock_level}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Save
          </button>
        </form>
      ) : null}
    </div>
  );
}

function QuantityForm({
  label,
  submitLabel,
  defaultValue,
  onSubmit,
}: {
  label: string;
  submitLabel: string;
  defaultValue?: number;
  onSubmit: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={async (formData) => {
        await onSubmit(formData);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">{label}</label>
        <input
          name="quantity"
          type="number"
          step="1"
          min="0"
          required
          defaultValue={defaultValue}
          className={clsx(inputClass, "w-28")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Reason (optional)</label>
        <input name="reason" className={clsx(inputClass, "w-48")} />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
      >
        {submitLabel}
      </button>
    </form>
  );
}
