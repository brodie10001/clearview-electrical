"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import {
  searchPriceBookItems,
  getFrequentlyUsedPriceBookItems,
  getPriceBookEstimate,
  addServiceItemLine,
  type PriceBookSearchResult,
  type PriceBookEstimate,
} from "../actions";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

type Step =
  | { name: "browse" }
  | { name: "quantity"; item: PriceBookSearchResult }
  | { name: "review"; item: PriceBookSearchResult; quantity: number };

// Mounted by the parent only while the dialog is open, so every open is a
// fresh mount — state never needs resetting via an effect. Same pattern as
// AddMaterialDialog, plus a review/confirm step before anything is written.
export function AddPriceBookItemDialog({
  onClose,
  quoteId,
  jobId,
  onAdded,
}: {
  onClose: () => void;
  quoteId: string;
  jobId: string;
  onAdded: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "browse" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PriceBookSearchResult[] | null>(null);
  const [frequentlyUsed, setFrequentlyUsed] = useState<PriceBookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFrequentlyUsedPriceBookItems().then(setFrequentlyUsed);
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
      searchPriceBookItems(query).then((r) => {
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
    <Dialog open onClose={onClose} title="Add Price Book item">
      {step.name === "browse" ? (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Price Book, e.g. Downlight"
              className={`${inputClass} w-full pl-8`}
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            <p className="mb-1.5 text-xs font-medium text-neutral-500">{listHeading}</p>
            {listToShow.length === 0 && !loading ? (
              <p className="py-3 text-center text-sm text-neutral-500">
                {query.trim() ? "No matching Price Book items." : "No usage history yet."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {listToShow.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setStep({ name: "quantity", item })}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-neutral-900 dark:text-neutral-50">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{item.category}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {money(item.defaultSellPrice)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {step.name === "quantity" ? (
        <QuantityStep
          item={step.item}
          onBack={() => setStep({ name: "browse" })}
          onNext={(quantity) => setStep({ name: "review", item: step.item, quantity })}
        />
      ) : null}

      {step.name === "review" ? (
        <ReviewStep
          item={step.item}
          quantity={step.quantity}
          quoteId={quoteId}
          jobId={jobId}
          onBack={() => setStep({ name: "quantity", item: step.item })}
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
  item,
  onBack,
  onNext,
}: {
  item: PriceBookSearchResult;
  onBack: () => void;
  onNext: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{item.name}</p>
        <p className="text-xs text-neutral-500">{money(item.defaultSellPrice)} each</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Quantity</label>
        <input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          autoFocus
          className={inputClass}
        />
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
          type="button"
          onClick={() => onNext(quantity)}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Review
        </button>
      </div>
    </div>
  );
}

// Nothing is written until "Add to Quote" is explicitly clicked here --
// this screen only reads the current estimate, it never mutates anything.
function ReviewStep({
  item,
  quantity,
  quoteId,
  jobId,
  onBack,
  onDone,
}: {
  item: PriceBookSearchResult;
  quantity: number;
  quoteId: string;
  jobId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [estimate, setEstimate] = useState<PriceBookEstimate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPriceBookEstimate(item.id, quantity).then(setEstimate);
  }, [item.id, quantity]);

  if (!estimate) {
    return <p className="py-6 text-center text-sm text-neutral-500">Loading estimate…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
          Customer will see
        </p>
        <div className="mt-1 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <p className="text-sm text-neutral-900 dark:text-neutral-50">
            {estimate.customerFacingDescription}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {quantity} × {money(estimate.unitSellPrice)} ={" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {money(estimate.lineTotal)}
            </span>
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
          Internal estimate (not shown to customer)
        </p>
        <div className="mt-1 flex flex-col gap-1 rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800/50">
          <div className="flex justify-between">
            <span className="text-neutral-500">Labour cost</span>
            <span className="text-neutral-700 dark:text-neutral-300">{money(estimate.labourCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Materials cost</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {money(estimate.materialsCost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Consumables</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {money(estimate.consumablesCost)}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1 font-medium dark:border-neutral-700">
            <span className="text-neutral-600 dark:text-neutral-400">Estimated profit</span>
            <span
              className={estimate.estimatedProfit < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
            >
              {money(estimate.estimatedProfit)} ({estimate.estimatedMarginPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
        >
          Back
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            const formData = new FormData();
            formData.set("price_book_item_id", item.id);
            formData.set("quantity", String(quantity));
            await addServiceItemLine(quoteId, jobId, formData);
            onDone();
          }}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add to Quote"}
        </button>
      </div>
    </div>
  );
}
