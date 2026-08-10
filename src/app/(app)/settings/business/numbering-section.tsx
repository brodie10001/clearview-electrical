"use client";

import { useActionState } from "react";
import { updateQuoteNumbering, updateInvoiceNumbering, type UpdateNumberingResult } from "./actions";
import type { BusinessSettings } from "./page";

const initialState: UpdateNumberingResult = { error: null };

export function NumberingSection({
  settings,
  canEdit,
}: {
  settings: BusinessSettings;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Quote & invoice numbering
        </h3>
        <p className="mb-3 text-xs text-neutral-500">
          Changing the starting number is only safe if it&apos;s higher than any number already
          in use.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <NumberingForm
          title="Quotes"
          prefixName="quote_number_prefix"
          nextName="quote_number_next"
          defaultPrefix={settings.quote_number_prefix}
          defaultNext={settings.quote_number_next}
          action={updateQuoteNumbering}
          canEdit={canEdit}
        />
        <NumberingForm
          title="Invoices"
          prefixName="invoice_number_prefix"
          nextName="invoice_number_next"
          defaultPrefix={settings.invoice_number_prefix}
          defaultNext={settings.invoice_number_next}
          action={updateInvoiceNumbering}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}

function NumberingForm({
  title,
  prefixName,
  nextName,
  defaultPrefix,
  defaultNext,
  action,
  canEdit,
}: {
  title: string;
  prefixName: string;
  nextName: string;
  defaultPrefix: string;
  defaultNext: number;
  action: (
    prevState: UpdateNumberingResult,
    formData: FormData,
  ) => Promise<UpdateNumberingResult>;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</h4>

      <fieldset disabled={!canEdit} className="flex flex-col gap-3 disabled:opacity-70">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Prefix
            </label>
            <input
              name={prefixName}
              defaultValue={defaultPrefix}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Next number
            </label>
            <input
              name={nextName}
              type="number"
              min="1"
              defaultValue={defaultNext}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </fieldset>
    </form>
  );
}
