"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { createTestType, updateTestType, toggleTestTypeActive } from "./actions";
import type { TestTypeSettingsData } from "./page";

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function TestTypesSection({
  testTypes,
  canEdit,
}: {
  testTypes: TestTypeSettingsData[];
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {testTypes.map((type) => (
          <li key={type.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
            {editingId === type.id ? (
              <form
                action={async (formData) => {
                  await updateTestType(type.id, formData);
                  setEditingId(null);
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input name="name" defaultValue={type.name} required className={inputClass} />
                <input
                  name="default_unit"
                  defaultValue={type.default_unit ?? ""}
                  placeholder="Unit"
                  className="w-24 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                />
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
                    {type.name}
                  </span>
                  {type.is_custom ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      Custom
                    </span>
                  ) : null}
                  {!type.active ? (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {type.default_unit ?? "—"}
                  </span>
                  {canEdit ? (
                    <>
                      <button
                        onClick={() => setEditingId(type.id)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        aria-label="Edit test type"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => startTransition(() => toggleTestTypeActive(type.id, !type.active))}
                        className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        {type.active ? "Deactivate" : "Activate"}
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
              await createTestType(formData);
              setAdding(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <input name="name" required placeholder="Test type name" className={inputClass} />
            <input
              name="default_unit"
              placeholder="Unit (optional)"
              className="w-32 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <label className="flex items-center gap-1.5 text-xs text-neutral-500">
              <input type="checkbox" name="is_custom" className="h-3.5 w-3.5 rounded border-neutral-300" />
              Custom
            </label>
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
            <Plus className="h-4 w-4" /> Add test type
          </button>
        )
      ) : null}
    </div>
  );
}
