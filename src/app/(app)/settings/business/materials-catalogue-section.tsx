"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Star, X, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import {
  createGenericMaterial,
  toggleGenericMaterialActive,
  createCatalogueProduct,
  updateCatalogueProduct,
  setPreferredCatalogueProduct,
  toggleCatalogueProductActive,
} from "./actions";
import type { GenericMaterialData, CatalogueProductData } from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function productLabel(product: CatalogueProductData) {
  return [product.brand, product.product_name].filter(Boolean).join(" ") || "Unnamed product";
}

export function MaterialsCatalogueSection({
  materials,
  products,
  defaultMarkupPercent,
  canEdit,
}: {
  materials: GenericMaterialData[];
  products: CatalogueProductData[];
  defaultMarkupPercent: number;
  canEdit: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingProductFor, setAddingProductFor] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category))).sort(),
    [materials],
  );

  const productsByMaterial = useMemo(() => {
    const map = new Map<string, CatalogueProductData[]>();
    for (const product of products) {
      const list = map.get(product.generic_material_id) ?? [];
      list.push(product);
      map.set(product.generic_material_id, list);
    }
    return map;
  }, [products]);

  const materialsByCategory = useMemo(() => {
    const map = new Map<string, GenericMaterialData[]>();
    for (const material of materials) {
      const list = map.get(material.category) ?? [];
      list.push(material);
      map.set(material.category, list);
    }
    return map;
  }, [materials]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-neutral-500">
        Manage the generic material types and branded product options used when searching for
        materials on a quote. Adding a product here never changes prices already snapshotted onto
        existing quotes.
      </p>

      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {category}
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {(materialsByCategory.get(category) ?? []).map((material) => {
              const materialProducts = productsByMaterial.get(material.id) ?? [];
              const expanded = expandedId === material.id;
              return (
                <li key={material.id} className="flex flex-col">
                  <button
                    onClick={() => setExpandedId(expanded ? null : material.id)}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                      )}
                      {material.name}
                      {!material.active ? (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                          Inactive
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {materialProducts.length} product{materialProducts.length === 1 ? "" : "s"}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                      {materialProducts.length === 0 ? (
                        <p className="text-xs text-neutral-500">No products yet.</p>
                      ) : (
                        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                          {materialProducts.map((product) =>
                            editingProductId === product.id ? (
                              <ProductForm
                                key={product.id}
                                product={product}
                                defaultMarkupPercent={defaultMarkupPercent}
                                onSubmit={async (formData) => {
                                  await updateCatalogueProduct(product.id, formData);
                                  setEditingProductId(null);
                                }}
                                onCancel={() => setEditingProductId(null)}
                              />
                            ) : (
                              <li
                                key={product.id}
                                className="flex items-center justify-between gap-3 py-2 first:pt-0"
                              >
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate text-sm text-neutral-900 dark:text-neutral-50">
                                    {productLabel(product)}
                                    {product.is_custom ? (
                                      <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                                        Custom
                                      </span>
                                    ) : null}
                                    {!product.active ? (
                                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                                        Archived
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="truncate text-xs text-neutral-500">
                                    {product.supplier_sku ? `SKU ${product.supplier_sku} · ` : ""}
                                    cost {money(product.cost_price)} · sell {money(product.sell_price)}
                                  </p>
                                </div>
                                {canEdit ? (
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      onClick={() =>
                                        setPreferredCatalogueProduct(material.id, product.id)
                                      }
                                      className={clsx(
                                        "rounded-md p-1.5",
                                        product.is_preferred
                                          ? "text-amber-500"
                                          : "text-neutral-300 hover:text-amber-500 dark:text-neutral-600",
                                      )}
                                      aria-label={
                                        product.is_preferred ? "Preferred product" : "Set as preferred"
                                      }
                                    >
                                      <Star
                                        className="h-3.5 w-3.5"
                                        fill={product.is_preferred ? "currentColor" : "none"}
                                      />
                                    </button>
                                    <button
                                      onClick={() => setEditingProductId(product.id)}
                                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                      aria-label="Edit product"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        toggleCatalogueProductActive(product.id, !product.active)
                                      }
                                      className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                    >
                                      {product.active ? "Archive" : "Restore"}
                                    </button>
                                  </div>
                                ) : null}
                              </li>
                            ),
                          )}
                        </ul>
                      )}

                      {canEdit ? (
                        addingProductFor === material.id ? (
                          <ProductForm
                            defaultMarkupPercent={defaultMarkupPercent}
                            onSubmit={async (formData) => {
                              await createCatalogueProduct(material.id, formData);
                              setAddingProductFor(null);
                            }}
                            onCancel={() => setAddingProductFor(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAddingProductFor(material.id)}
                              className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add product
                            </button>
                            <button
                              onClick={() =>
                                toggleGenericMaterialActive(material.id, !material.active)
                              }
                              className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                            >
                              {material.active ? "Archive material type" : "Restore material type"}
                            </button>
                          </div>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {canEdit ? (
        addingMaterial ? (
          <form
            action={async (formData) => {
              await createGenericMaterial(formData);
              setAddingMaterial(false);
            }}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Material name</label>
              <input name="name" required placeholder="e.g. Weatherproof GPO" className={inputClass} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Category</label>
              <input name="category" required list="material-categories" className={inputClass} />
              <datalist id="material-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-1">
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingMaterial(false)}
                className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingMaterial(true)}
            className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add material type
          </button>
        )
      ) : null}
    </div>
  );
}

function ProductForm({
  product,
  defaultMarkupPercent,
  onSubmit,
  onCancel,
}: {
  product?: CatalogueProductData;
  defaultMarkupPercent: number;
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [cost, setCost] = useState(product?.cost_price ?? 0);
  const [markup, setMarkup] = useState(product?.default_markup_percent ?? "");
  const [sellPrice, setSellPrice] = useState(product?.sell_price ?? 0);

  function recalculate() {
    const markupPercent = markup === "" ? defaultMarkupPercent : Number(markup);
    setSellPrice(Number((cost * (1 + markupPercent / 100)).toFixed(2)));
  }

  return (
    <li className="flex flex-col gap-2 py-2.5 first:pt-0">
      <form
        action={async (formData) => {
          await onSubmit(formData);
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Brand</label>
            <input name="brand" defaultValue={product?.brand ?? ""} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Product / range</label>
            <input
              name="product_name"
              defaultValue={product?.product_name ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Supplier SKU</label>
            <input
              name="supplier_sku"
              defaultValue={product?.supplier_sku ?? ""}
              className={inputClass}
            />
          </div>
          {!product ? (
            <div className="flex flex-col justify-end gap-1 pb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <input name="is_custom" type="checkbox" className="h-3.5 w-3.5" /> Custom / one-off
              </label>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Cost price</label>
            <input
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">
              Markup % <span className="text-neutral-400">(default {defaultMarkupPercent}%)</span>
            </label>
            <input
              name="default_markup_percent"
              type="number"
              step="0.1"
              min="0"
              placeholder={String(defaultMarkupPercent)}
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Sell price</label>
            <div className="flex items-center gap-1">
              <input
                name="sell_price"
                type="number"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value) || 0)}
                className={clsx(inputClass, "w-full")}
              />
              <button
                type="button"
                onClick={recalculate}
                title="Recalculate from cost + markup"
                className="shrink-0 rounded-lg border border-neutral-300 p-1.5 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
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
    </li>
  );
}
