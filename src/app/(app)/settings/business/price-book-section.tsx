"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, X, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  createPriceBookItem,
  updatePriceBookItem,
  togglePriceBookItemActive,
  addPriceBookItemMaterial,
  removePriceBookItemMaterial,
} from "./actions";
import type {
  PriceBookItemData,
  PriceBookItemMaterialData,
  LabourRateType,
  CatalogueProductData,
} from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function productLabel(product: CatalogueProductData) {
  return [product.brand, product.product_name].filter(Boolean).join(" ") || "Unnamed product";
}

// Internal cost estimate for a Price Book item, computed the same way as
// getPriceBookEstimate on the server -- kept in sync by hand since this is a
// live client-side preview while editing, not a round trip. Never used to
// set default_sell_price, which is always entered by hand.
function estimateCost({
  labourHours,
  ratePerHour,
  consumables,
  materials,
}: {
  labourHours: number;
  ratePerHour: number;
  consumables: number;
  materials: { quantity: number; costPrice: number }[];
}) {
  const labourCost = labourHours * ratePerHour;
  const materialsCost = materials.reduce((sum, m) => sum + m.quantity * m.costPrice, 0);
  return { labourCost, materialsCost, totalCost: labourCost + materialsCost + consumables };
}

export function PriceBookSection({
  items,
  itemMaterials,
  rateTypes,
  products,
  canEdit,
}: {
  items: PriceBookItemData[];
  itemMaterials: PriceBookItemMaterialData[];
  rateTypes: LabourRateType[];
  products: CatalogueProductData[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const materialsByItem = useMemo(() => {
    const map = new Map<string, PriceBookItemMaterialData[]>();
    for (const link of itemMaterials) {
      const list = map.get(link.price_book_item_id) ?? [];
      list.push(link);
      map.set(link.price_book_item_id, list);
    }
    return map;
  }, [itemMaterials]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );

  const visibleItems = showArchived ? items : items.filter((i) => i.active);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-neutral-500">
        Flat-rate service items for the quote builder -- one confirmed price for a common job
        instead of building it up from labour + materials each time. The sell price is always set
        by hand; the cost breakdown here is for your own profitability visibility only.
      </p>

      <label className="flex w-fit items-center gap-1.5 text-xs font-medium text-neutral-500">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Show archived
      </label>

      {categories.map((category) => {
        const categoryItems = visibleItems.filter((i) => i.category === category);
        if (categoryItems.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {category}
            </h3>
            <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {categoryItems.map((item) =>
                editingId === item.id ? (
                  <li key={item.id} className="p-3">
                    <PriceBookItemForm
                      item={item}
                      links={materialsByItem.get(item.id) ?? []}
                      productById={productById}
                      products={products}
                      rateTypes={rateTypes}
                      onSubmit={async (formData) => {
                        await updatePriceBookItem(item.id, formData);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm text-neutral-900 dark:text-neutral-50">
                        {item.name}
                        {!item.active ? (
                          <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                            Archived
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {money(item.default_sell_price)} ·{" "}
                        {(materialsByItem.get(item.id) ?? []).length} material
                        {(materialsByItem.get(item.id) ?? []).length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          aria-label="Edit item"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => togglePriceBookItemActive(item.id, !item.active)}
                          className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        >
                          {item.active ? "Archive" : "Restore"}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          </div>
        );
      })}

      {canEdit ? (
        adding ? (
          <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <PriceBookItemForm
              links={[]}
              productById={productById}
              products={products}
              rateTypes={rateTypes}
              onSubmit={async (formData) => {
                await createPriceBookItem(formData);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add Price Book item
          </button>
        )
      ) : null}

      <datalist id="price-book-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

function PriceBookItemForm({
  item,
  links,
  productById,
  products,
  rateTypes,
  onSubmit,
  onCancel,
}: {
  item?: PriceBookItemData;
  links: PriceBookItemMaterialData[];
  productById: Map<string, CatalogueProductData>;
  products: CatalogueProductData[];
  rateTypes: LabourRateType[];
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [sellPrice, setSellPrice] = useState(item?.default_sell_price ?? 0);
  const [labourHours, setLabourHours] = useState(item?.labour_allowance_hours ?? "");
  const [rateTypeId, setRateTypeId] = useState(item?.labour_rate_type_id ?? "");
  const [consumables, setConsumables] = useState(item?.consumables_allowance ?? "");
  const [addingMaterial, setAddingMaterial] = useState(false);

  const selectedRate = rateTypes.find((rt) => rt.id === rateTypeId);

  const estimate = estimateCost({
    labourHours: Number(labourHours) || 0,
    ratePerHour: selectedRate?.rate_per_hour ?? 0,
    consumables: Number(consumables) || 0,
    materials: links.map((link) => ({
      quantity: link.quantity,
      costPrice: productById.get(link.catalogue_product_id)?.cost_price ?? 0,
    })),
  });
  const estimatedProfit = sellPrice - estimate.totalCost;
  const estimatedMarginPercent = sellPrice > 0 ? (estimatedProfit / sellPrice) * 100 : 0;

  const linkedProductIds = new Set(links.map((l) => l.catalogue_product_id));
  const availableProducts = products.filter((p) => p.active && !linkedProductIds.has(p.id));

  return (
    <form
      action={async (formData) => {
        await onSubmit(formData);
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Name (internal)</label>
          <input name="name" required defaultValue={item?.name ?? ""} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Category</label>
          <input
            name="category"
            required
            defaultValue={item?.category ?? ""}
            list="price-book-categories"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Customer-facing description</label>
        <input
          name="customer_facing_description"
          required
          defaultValue={item?.customer_facing_description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1 sm:w-40">
        <label className="text-xs font-medium text-neutral-500">Sell price</label>
        <NumericInput
          name="default_sell_price"
          step={0.01}
          min={0}
          required
          value={sellPrice}
          onChange={setSellPrice}
          className={inputClass}
        />
      </div>

      <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
        <p className="mb-2 text-xs font-medium text-neutral-500">
          Internal cost breakdown -- never shown to the customer, never used to set the sell price
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Labour hours</label>
            <input
              name="labour_allowance_hours"
              type="number"
              step="0.25"
              min="0"
              value={labourHours}
              onChange={(e) => setLabourHours(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Labour rate</label>
            <select
              name="labour_rate_type_id"
              value={rateTypeId}
              onChange={(e) => setRateTypeId(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {rateTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} ({money(rt.rate_per_hour)}/hr)
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Consumables ($)</label>
            <input
              name="consumables_allowance"
              type="number"
              step="0.01"
              min="0"
              value={consumables}
              onChange={(e) => setConsumables(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {item ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-neutral-500">Linked materials</p>
            {links.length === 0 ? (
              <p className="text-xs text-neutral-400">No materials linked.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {links.map((link) => {
                  const product = productById.get(link.catalogue_product_id);
                  return (
                    <li key={link.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-neutral-600 dark:text-neutral-400">
                        {link.quantity} × {product ? productLabel(product) : "Unknown product"} (
                        {money(product?.cost_price ?? 0)} ea)
                      </span>
                      <button
                        type="button"
                        onClick={() => removePriceBookItemMaterial(link.id)}
                        className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-red-600"
                        aria-label="Remove material"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {addingMaterial ? (
              <AddLinkedMaterialForm
                itemId={item.id}
                availableProducts={availableProducts}
                onDone={() => setAddingMaterial(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingMaterial(true)}
                disabled={availableProducts.length === 0}
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-700 disabled:opacity-50 dark:hover:text-neutral-200"
              >
                <Plus className="h-3 w-3" /> Add material
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-neutral-400">
            Save this item first, then edit it again to link materials.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-200 pt-2 text-xs dark:border-neutral-700">
          <span className="text-neutral-500">
            Labour {money(estimate.labourCost)} · Materials {money(estimate.materialsCost)} ·
            Consumables {money(Number(consumables) || 0)}
          </span>
          <span
            className={clsx(
              "font-medium",
              estimatedProfit < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            Est. profit {money(estimatedProfit)} ({estimatedMarginPercent.toFixed(1)}% margin)
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </form>
  );
}

function AddLinkedMaterialForm({
  itemId,
  availableProducts,
  onDone,
}: {
  itemId: string;
  availableProducts: CatalogueProductData[];
  onDone: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await addPriceBookItemMaterial(itemId, formData);
        onDone();
      }}
      className="mt-1.5 flex flex-wrap items-end gap-1.5"
    >
      <select name="catalogue_product_id" required defaultValue="" className={clsx(inputClass, "py-1 text-xs")}>
        <option value="" disabled>
          Product...
        </option>
        {availableProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {productLabel(p)}
          </option>
        ))}
      </select>
      <input
        name="quantity"
        type="number"
        step="1"
        min="1"
        defaultValue={1}
        className={clsx(inputClass, "w-16 py-1 text-xs")}
      />
      <button
        type="submit"
        className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md px-1.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        Cancel
      </button>
    </form>
  );
}
