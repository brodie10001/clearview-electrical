"use client";

import { useActionState, useEffect } from "react";
import {
  createCustomer,
  createCustomerInline,
  type CreateCustomerInlineState,
} from "@/app/(app)/customers/actions";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";
const labelClass = "text-sm font-medium text-neutral-700 dark:text-neutral-300";

type CustomerFormProps =
  | { mode: "page" }
  | {
      mode: "embedded";
      onCreated: (customer: { id: string; name: string }) => void;
      onCancel: () => void;
    };

const initialInlineState: CreateCustomerInlineState = { error: null, customer: null };

// Same fields and the same underlying insert as the standalone /customers/new
// page, but usable either as that full page (mode="page") or embedded in a
// stacked dialog (mode="embedded", e.g. from the property-creation sheet).
export function CustomerForm(props: CustomerFormProps) {
  const embedded = props.mode === "embedded";
  const [state, formAction, pending] = useActionState(createCustomerInline, initialInlineState);

  useEffect(() => {
    if (embedded && state.customer) {
      props.onCreated(state.customer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.customer]);

  return (
    <form action={embedded ? formAction : createCustomer} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Name</label>
        <input name="name" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Email</label>
        <input name="email" type="email" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Phone</label>
        <input name="phone" type="tel" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Billing address</label>
        <textarea name="billing_address" rows={2} className={`resize-none ${inputClass}`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Notes</label>
        <textarea name="notes" rows={3} className={`resize-none ${inputClass}`} />
      </div>

      {embedded && state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      {embedded ? (
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? "Creating..." : "Create customer"}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Create customer
        </button>
      )}
    </form>
  );
}
