"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  createProperty,
  createPropertyInline,
  type CreatePropertyInlineState,
} from "@/app/(app)/properties/actions";

export interface PropertyCustomerOption {
  id: string;
  name: string;
}

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";
const labelClass = "text-sm font-medium text-neutral-700 dark:text-neutral-300";

type PropertyFormProps =
  | {
      mode: "page";
      customers: PropertyCustomerOption[];
      defaultCustomerId?: string;
    }
  | {
      mode: "embedded";
      customers: PropertyCustomerOption[];
      customerId: string;
      onCustomerIdChange: (customerId: string) => void;
      onCreateNewCustomer: () => void;
      onCreated: (property: { id: string; address: string; customerId: string }) => void;
      onCancel: () => void;
    };

const initialInlineState: CreatePropertyInlineState = { error: null, property: null };

const CREATE_NEW_CUSTOMER = "__create_new_customer__";

// Same fields and the same underlying insert as the standalone /properties/new
// page, but usable either as that full page (mode="page") or embedded in a
// stacked dialog (mode="embedded", e.g. from the New Job flow) -- the only
// differences are how the customer field is selected/offered and what
// happens after a successful create.
export function PropertyForm(props: PropertyFormProps) {
  const embedded = props.mode === "embedded";
  const [state, formAction, pending] = useActionState(createPropertyInline, initialInlineState);

  useEffect(() => {
    if (embedded && state.property) {
      props.onCreated(state.property);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.property]);

  return (
    <form action={embedded ? formAction : createProperty} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Customer</label>
        <select
          name="customer_id"
          required
          className={inputClass}
          {...(embedded
            ? {
                value: props.customerId,
                onChange: (e) => {
                  if (e.target.value === CREATE_NEW_CUSTOMER) {
                    props.onCreateNewCustomer();
                    return;
                  }
                  props.onCustomerIdChange(e.target.value);
                },
              }
            : { defaultValue: props.defaultCustomerId ?? "" })}
        >
          <option value="" disabled>
            Select a customer...
          </option>
          {props.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {embedded ? <option value={CREATE_NEW_CUSTOMER}>+ Create new customer</option> : null}
        </select>
        {embedded ? null : (
          <p className="text-xs text-neutral-500">
            Don&apos;t see them?{" "}
            <Link href="/customers/new" className="text-amber-600 hover:underline">
              Add a new customer
            </Link>{" "}
            first.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Address</label>
        <input name="address" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Property type</label>
        <select name="property_type" required defaultValue="residential" className={inputClass}>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>GPS latitude (optional)</label>
          <input name="gps_lat" type="number" step="any" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>GPS longitude (optional)</label>
          <input name="gps_lng" type="number" step="any" className={inputClass} />
        </div>
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
            {pending ? "Creating..." : "Create property"}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Create property
        </button>
      )}
    </form>
  );
}
