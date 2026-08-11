"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Star,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  createGenericMaterial,
  toggleGenericMaterialActive,
  createCatalogueProduct,
  updateCatalogueProduct,
  setPreferredCatalogueProduct,
  toggleCatalogueProductActive,
  upsertSupplierProductPrice,
  setPreferredSupplierPrice,
  dismissSupplierPriceReview,
  dismissCategoryReview,
} from "./actions";
import type {
  GenericMaterialData,
  CatalogueProductData,
  SupplierData,
  SupplierProductPriceData,
} from "./page";

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
  suppliers,
  supplierPrices,
  defaultMarkupPercent,
  canEdit,
}: {
  materials: GenericMaterialData[];
  products: CatalogueProductData[];
  suppliers: SupplierData[];
  supplierPrices: SupplierProductPriceData[];
  defaultMarkupPercent: number;
  canEdit: boolean;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingProductFor, setAddingProductFor] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);

  function toggleExpanded(materialId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) next.delete(materialId);
      else next.add(materialId);
      return next;
    });
  }

  const productsByMaterial = useMemo(() => {
    const map = new Map<string, CatalogueProductData[]>();
    for (const product of products) {
      const list = map.get(product.generic_material_id) ?? [];
      list.push(product);
      map.set(product.generic_material_id, list);
    }
    return map;
  }, [products]);

  const reviewCount = useMemo(
    () => products.filter((p) => p.needs_category_review).length,
    [products],
  );

  const visibleMaterials = useMemo(() => {
    if (!reviewOnly) return materials;
    return materials.filter((m) =>
      (productsByMaterial.get(m.id) ?? []).some((p) => p.needs_category_review),
    );
  }, [materials, productsByMaterial, reviewOnly]);

  const categories = useMemo(
    () => Array.from(new Set(visibleMaterials.map((m) => m.category))).sort(),
    [visibleMaterials],
  );

  const pricesByProduct = useMemo(() => {
    const map = new Map<string, SupplierProductPriceData[]>();
    for (const price of supplierPrices) {
      const list = map.get(price.catalogue_product_id) ?? [];
      list.push(price);
      map.set(price.catalogue_product_id, list);
    }
    return map;
  }, [supplierPrices]);

  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  const materialsByCategory = useMemo(() => {
    const map = new Map<string, GenericMaterialData[]>();
    for (const material of visibleMaterials) {
      const list = map.get(material.category) ?? [];
      list.push(material);
      map.set(material.category, list);
    }
    return map;
  }, [visibleMaterials]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-neutral-500">
        Manage the generic material types and branded product options used when searching for
        materials on a quote. Adding a product here never changes prices already snapshotted onto
        existing quotes.
      </p>

      {reviewCount > 0 ? (
        <label className="flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(e) => {
              setReviewOnly(e.target.checked);
              if (e.target.checked) {
                setExpandedIds(
                  new Set(
                    materials
                      .filter((m) =>
                        (productsByMaterial.get(m.id) ?? []).some((p) => p.needs_category_review),
                      )
                      .map((m) => m.id),
                  ),
                );
              }
            }}
            className="h-3.5 w-3.5"
          />
          {reviewCount} product{reviewCount === 1 ? "" : "s"} need category review -- show only
          those
        </label>
      ) : null}

      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {category}
          </h3>
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {(materialsByCategory.get(category) ?? []).map((material) => {
              const materialProducts = productsByMaterial.get(material.id) ?? [];
              const expanded = expandedIds.has(material.id);
              return (
                <li key={material.id} className="flex flex-col">
                  <button
                    onClick={() => toggleExpanded(material.id)}
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
                              <li key={product.id} className="flex flex-col gap-2 py-2 first:pt-0">
                                <div className="flex items-center justify-between gap-3">
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
                                      {product.needs_category_review ? (
                                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                          <AlertTriangle className="h-2.5 w-2.5" /> Review category
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="truncate text-xs text-neutral-500">
                                      cost {money(product.cost_price)} · sell{" "}
                                      {money(product.sell_price)} · per {product.unit}
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
                                          product.is_preferred
                                            ? "Preferred product"
                                            : "Set as preferred"
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
                                      {product.needs_category_review ? (
                                        <button
                                          onClick={() => dismissCategoryReview(product.id)}
                                          className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                        >
                                          Confirm category
                                        </button>
                                      ) : null}
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
                                </div>

                                <SupplierPricesList
                                  productId={product.id}
                                  prices={pricesByProduct.get(product.id) ?? []}
                                  suppliers={suppliers}
                                  supplierById={supplierById}
                                  canEdit={canEdit}
                                />
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
            <label className="text-xs font-medium text-neutral-500">Unit</label>
            <input
              name="unit"
              defaultValue={product?.unit ?? "each"}
              placeholder="each"
              list="catalogue-product-units"
              className={inputClass}
            />
            <datalist id="catalogue-product-units">
              <option value="each" />
              <option value="m" />
              <option value="box" />
            </datalist>
          </div>
          {!product ? (
            <div className="flex flex-col justify-end gap-1 pb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <input name="is_custom" type="checkbox" className="h-3.5 w-3.5" /> Custom / one-off
              </label>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-neutral-400">
          Cost price is overwritten automatically once a preferred supplier price is set below --
          edit it here only for products with no supplier price yet.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Cost price</label>
            <NumericInput
              name="cost_price"
              step={0.01}
              min={0}
              value={cost}
              onChange={setCost}
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
              <NumericInput
                name="sell_price"
                step={0.01}
                min={0}
                value={sellPrice}
                onChange={setSellPrice}
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

function SupplierPricesList({
  productId,
  prices,
  suppliers,
  supplierById,
  canEdit,
}: {
  productId: string;
  prices: SupplierProductPriceData[];
  suppliers: SupplierData[];
  supplierById: Map<string, SupplierData>;
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);

  const suppliersWithoutPrice = suppliers.filter(
    (s) => !prices.some((p) => p.supplier_id === s.id),
  );

  return (
    <div className="rounded-lg bg-white pl-4 dark:bg-neutral-900">
      {prices.length === 0 ? (
        <p className="text-xs text-neutral-400">No supplier prices yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {prices.map((price) =>
            editingPriceId === price.id ? (
              <SupplierPriceForm
                key={price.id}
                productId={productId}
                price={price}
                suppliers={suppliers}
                onDone={() => setEditingPriceId(null)}
              />
            ) : (
              <li key={price.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-neutral-600 dark:text-neutral-400">
                  <button
                    onClick={() => canEdit && setPreferredSupplierPrice(productId, price.id)}
                    disabled={!canEdit}
                    className={clsx(
                      "shrink-0 rounded p-0.5",
                      price.is_preferred
                        ? "text-amber-500"
                        : "text-neutral-300 hover:text-amber-500 dark:text-neutral-600",
                    )}
                    aria-label={price.is_preferred ? "Preferred supplier" : "Set as preferred"}
                  >
                    <Star className="h-3 w-3" fill={price.is_preferred ? "currentColor" : "none"} />
                  </button>
                  <span className="truncate">
                    {supplierById.get(price.supplier_id)?.name ?? "Unknown supplier"}
                    {price.supplier_sku ? ` · SKU ${price.supplier_sku}` : ""} ·{" "}
                    {money(price.cost_price)}
                  </span>
                  {price.needs_supplier_review ? (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      title="Supplier was assumed during migration -- confirm it's correct"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" /> Needs review
                    </span>
                  ) : null}
                </span>
                {canEdit ? (
                  <span className="flex shrink-0 items-center gap-2">
                    {price.needs_supplier_review ? (
                      <button
                        onClick={() => dismissSupplierPriceReview(price.id)}
                        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        Confirm
                      </button>
                    ) : null}
                    <button
                      onClick={() => setEditingPriceId(price.id)}
                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      Edit
                    </button>
                  </span>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}

      {canEdit && suppliersWithoutPrice.length > 0 ? (
        adding ? (
          <SupplierPriceForm
            productId={productId}
            suppliers={suppliersWithoutPrice}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <Plus className="h-3 w-3" /> Add supplier price
          </button>
        )
      ) : null}
    </div>
  );
}

function SupplierPriceForm({
  productId,
  price,
  suppliers,
  onDone,
}: {
  productId: string;
  price?: SupplierProductPriceData;
  suppliers: SupplierData[];
  onDone: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await upsertSupplierProductPrice(productId, formData);
        onDone();
      }}
      className="flex flex-wrap items-end gap-1.5 py-1"
    >
      {price ? (
        <input type="hidden" name="supplier_id" value={price.supplier_id} />
      ) : (
        <select name="supplier_id" required defaultValue="" className={clsx(inputClass, "py-1 text-xs")}>
          <option value="" disabled>
            Supplier...
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <input
        name="supplier_sku"
        placeholder="SKU"
        defaultValue={price?.supplier_sku ?? ""}
        className={clsx(inputClass, "w-24 py-1 text-xs")}
      />
      <input
        name="cost_price"
        type="number"
        step="0.01"
        min="0"
        placeholder="Cost"
        defaultValue={price?.cost_price ?? ""}
        className={clsx(inputClass, "w-24 py-1 text-xs")}
      />
      <button
        type="submit"
        className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
      >
        Save
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
