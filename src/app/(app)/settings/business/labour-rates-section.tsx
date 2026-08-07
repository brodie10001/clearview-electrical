"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import {
  createLabourRateType,
  updateLabourRateType,
  toggleLabourRateTypeActive,
} from "./actions";
import type { LabourRateType } from "./page";

export function LabourRatesSection({
  rateTypes,
  canEdit,
}: {
  rateTypes: LabourRateType[];
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {rateTypes.map((rate) => (
          <li key={rate.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
            {editingId === rate.id ? (
              <form
                action={async (formData) => {
                  await updateLabourRateType(rate.id, formData);
                  setEditingId(null);
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input
                  name="name"
                  defaultValue={rate.name}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                />
                <div className="flex items-center gap-1 text-sm text-neutral-500">
                  $
                  <input
                    name="rate_per_hour"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={rate.rate_per_hour}
                    required
                    className="w-24 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                  /hr
                </div>
                <button
                  type="submit"
                  className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  aria-label="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {rate.name}
                  </span>
                  {!rate.is_active ? (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    ${rate.rate_per_hour.toFixed(2)}/hr
                  </span>
                  {canEdit ? (
                    <>
                      <button
                        onClick={() => setEditingId(rate.id)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        aria-label="Edit rate"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          startTransition(() =>
                            toggleLabourRateTypeActive(rate.id, !rate.is_active),
                          )
                        }
                        className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        {rate.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {canEdit ? (
        adding ? (
          <form
            action={async (formData) => {
              await createLabourRateType(formData);
              setAdding(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <input
              name="name"
              required
              placeholder="Rate name"
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              $
              <input
                name="rate_per_hour"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-24 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
              /hr
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
            <Plus className="h-4 w-4" /> Add rate type
          </button>
        )
      ) : null}
    </div>
  );
}
