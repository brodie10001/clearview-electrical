"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { createVariation, updateVariation, updateVariationStatus, deleteVariation } from "../actions";
import type { VariationStatus } from "@/types/database";

const VARIATION_STATUSES: VariationStatus[] = ["Draft", "Approved", "Rejected"];

const STATUS_STYLES: Record<VariationStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export interface VariationData {
  id: string;
  description: string;
  amount: number;
  status: VariationStatus;
}

function signedMoney(amount: number) {
  const sign = amount < 0 ? "-" : "+";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

export function VariationsSection({ jobId, variations }: { jobId: string; variations: VariationData[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {variations.length === 0 ? (
        <p className="text-sm text-neutral-500">No variations for this job yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {variations.map((variation) =>
            editingId === variation.id ? (
              <VariationEditRow
                key={variation.id}
                variation={variation}
                jobId={jobId}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <li
                key={variation.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {variation.description}
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[variation.status]}`}
                  >
                    {variation.status}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`text-sm font-medium ${variation.amount < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-50"}`}
                  >
                    {signedMoney(variation.amount)}
                  </span>
                  <select
                    value={variation.status}
                    onChange={(e) =>
                      startTransition(() =>
                        updateVariationStatus(variation.id, jobId, e.target.value as VariationStatus),
                      )
                    }
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {VARIATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setEditingId(variation.id)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label="Edit variation"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => startTransition(() => deleteVariation(variation.id, jobId))}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                    aria-label="Delete variation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {adding ? (
        <form
          action={async (formData) => {
            await createVariation(jobId, formData);
            setAdding(false);
          }}
          className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-end"
        >
          <VariationFields />
          <div className="flex gap-1">
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
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" /> Add variation
        </button>
      )}
    </div>
  );
}

function VariationFields({ defaults }: { defaults?: VariationData }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Description</label>
        <input name="description" required defaultValue={defaults?.description ?? ""} className={inputClass} />
      </div>
      <div className="flex w-32 flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">
          Amount <span className="text-neutral-400">(+/-)</span>
        </label>
        <input
          name="amount"
          type="number"
          step="0.01"
          required
          defaultValue={defaults?.amount ?? ""}
          className={inputClass}
        />
      </div>
    </>
  );
}

function VariationEditRow({
  variation,
  jobId,
  onDone,
}: {
  variation: VariationData;
  jobId: string;
  onDone: () => void;
}) {
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <form
        action={async (formData) => {
          await updateVariation(variation.id, jobId, formData);
          onDone();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <VariationFields defaults={variation} />
        <div className="flex gap-1">
          <button
            type="submit"
            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </li>
  );
}
