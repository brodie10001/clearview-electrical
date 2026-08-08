"use client";

import { useActionState } from "react";
import { updateCustomer } from "../actions";
import { PAYMENT_TERMS_OPTIONS } from "@/lib/payment-terms";
import type { PaymentTerms } from "@/types/database";

interface CustomerFormData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  notes: string | null;
  payment_terms: PaymentTerms | null;
}

export function CustomerInfoForm({ customer }: { customer: CustomerFormData }) {
  const [, formAction, pending] = useActionState(async (_: null, formData: FormData) => {
    await updateCustomer(customer.id, formData);
    return null;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Name
        </label>
        <input
          name="name"
          required
          defaultValue={customer.name}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Email
        </label>
        <input
          name="email"
          type="email"
          defaultValue={customer.email ?? ""}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Phone
        </label>
        <input
          name="phone"
          type="tel"
          defaultValue={customer.phone ?? ""}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Billing address
        </label>
        <textarea
          name="billing_address"
          rows={2}
          defaultValue={customer.billing_address ?? ""}
          className="resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Payment terms
        </label>
        <select
          name="payment_terms"
          defaultValue={customer.payment_terms ?? ""}
          className="max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="">Use business default</option>
          {PAYMENT_TERMS_OPTIONS.map((term) => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={customer.notes ?? ""}
          className="resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
