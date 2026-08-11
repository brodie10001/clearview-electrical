"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Star, Wrench } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { NumericInput } from "@/components/ui/numeric-input";
import { searchCatalogueProducts, getFrequentlyUsedProducts, addMaterialLine } from "../actions";
import type { CatalogueSearchResult } from "../actions";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function productLabel(product: CatalogueSearchResult) {
  const brandProduct = [product.brand, product.productName].filter(Boolean).join(" ");
  return brandProduct ? `${product.materialName} — ${brandProduct}` : product.materialName;
}

type Step =
  | { name: "browse" }
  | { name: "quantity"; product: CatalogueSearchResult }
  | { name: "custom" };

// Mounted by the parent only while the dialog is open, so every open is a
// fresh mount — state never needs resetting via an effect.
export function AddMaterialDialog({
  onClose,
  quoteId,
  jobId,
  defaultMarkupPercent,
  onAdded,
}: {
  onClose: () => void;
  quoteId: string;
  jobId: string;
  defaultMarkupPercent: number;
  onAdded: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "browse" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogueSearchResult[] | null>(null);
  const [frequentlyUsed, setFrequentlyUsed] = useState<CatalogueSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Fetching "frequently used" from the server on mount, no render-time
    // alternative.
    getFrequentlyUsedProducts().then(setFrequentlyUsed);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchCatalogueProducts(query).then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const listToShow = query.trim() ? (results ?? []) : frequentlyUsed;
  const listHeading = query.trim() ? (loading ? "Searching…" : "Results") : "Frequently used";

  return (
    <Dialog open onClose={onClose} title="Add material">
      {step.name === "browse" ? (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search materials, e.g. Double GPO"
              className={`${inputClass} w-full pl-8`}
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            <p className="mb-1.5 text-xs font-medium text-neutral-500">{listHeading}</p>
            {listToShow.length === 0 && !loading ? (
              <p className="py-3 text-center text-sm text-neutral-500">
                {query.trim() ? "No matching materials." : "No usage history yet."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {listToShow.map((product) => (
                  <li key={product.productId}>
                    <button
                      onClick={() => setStep({ name: "quantity", product })}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        {product.isPreferred ? (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                        ) : null}
                        <span className="truncate text-sm text-neutral-900 dark:text-neutral-50">
                          {productLabel(product)}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        ${product.sellPrice.toFixed(2)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => setStep({ name: "custom" })}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Wrench className="h-3.5 w-3.5" /> Custom / one-off item
          </button>
        </div>
      ) : null}

      {step.name === "quantity" ? (
        <QuantityStep
          product={step.product}
          quoteId={quoteId}
          jobId={jobId}
          onBack={() => setStep({ name: "browse" })}
          onDone={() => {
            onAdded();
            onClose();
          }}
        />
      ) : null}

      {step.name === "custom" ? (
        <CustomStep
          quoteId={quoteId}
          jobId={jobId}
          defaultMarkupPercent={defaultMarkupPercent}
          onBack={() => setStep({ name: "browse" })}
          onDone={() => {
            onAdded();
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}

function QuantityStep({
  product,
  quoteId,
  jobId,
  onBack,
  onDone,
}: {
  product: CatalogueSearchResult;
  quoteId: string;
  jobId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <form
      action={async () => {
        const formData = new FormData();
        formData.set("catalogue_product_id", product.productId);
        formData.set("quantity", String(quantity));
        await addMaterialLine(quoteId, jobId, formData);
        onDone();
      }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
        <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {product.isPreferred ? (
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
          ) : null}
          {productLabel(product)}
        </p>
        <p className="text-xs text-neutral-500">${product.sellPrice.toFixed(2)} each</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Quantity</label>
        <NumericInput
          min={1}
          step={1}
          fallback={1}
          value={quantity}
          onChange={setQuantity}
          autoFocus
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          Line total{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-50">
            ${(quantity * product.sellPrice).toFixed(2)}
          </span>
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Back
          </button>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Add to quote
          </button>
        </div>
      </div>
    </form>
  );
}

function CustomStep({
  quoteId,
  jobId,
  defaultMarkupPercent,
  onBack,
  onDone,
}: {
  quoteId: string;
  jobId: string;
  defaultMarkupPercent: number;
  onBack: () => void;
  onDone: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await addMaterialLine(quoteId, jobId, formData);
        onDone();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Description</label>
        <input name="description" required autoFocus className={inputClass} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Cost</label>
          <input name="cost" type="number" step="0.01" min="0" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Markup %</label>
          <input
            name="markup_percent"
            type="number"
            step="0.1"
            min="0"
            defaultValue={defaultMarkupPercent}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Quantity</label>
          <input
            name="quantity"
            type="number"
            step="1"
            min="1"
            defaultValue={1}
            required
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Add to quote
        </button>
      </div>
    </form>
  );
}
