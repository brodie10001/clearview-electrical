"use client";

import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { updateOnboardingQuoteInvoiceDefaults } from "../actions";
import { updateQuoteNumbering, updateInvoiceNumbering } from "@/app/(app)/settings/business/actions";
import { Field, StepNav } from "./step-ui";
import { PAYMENT_TERMS_OPTIONS } from "@/lib/payment-terms";
import type { OnboardingSettings } from "../page";
import type { PaymentTerms } from "@/types/database";

export function QuotesInvoicesStep({
  settings,
  onSaved,
  onBack,
}: {
  settings: OnboardingSettings;
  onSaved: (patch: Partial<OnboardingSettings>) => void;
  onBack: (() => void) | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    setPending(true);
    setError(null);

    const formData = new FormData(formRef.current);

    const defaultsResult = await updateOnboardingQuoteInvoiceDefaults(
      { error: null },
      formData,
    );
    if (defaultsResult.error) {
      setError(defaultsResult.error);
      setPending(false);
      return;
    }

    const quoteResult = await updateQuoteNumbering({ error: null }, formData);
    if (quoteResult.error) {
      setError(quoteResult.error);
      setPending(false);
      return;
    }

    const invoiceResult = await updateInvoiceNumbering({ error: null }, formData);
    if (invoiceResult.error) {
      setError(invoiceResult.error);
      setPending(false);
      return;
    }

    setPending(false);
    onSaved({
      default_quote_validity_days: formData.get("default_quote_validity_days")
        ? Number(formData.get("default_quote_validity_days"))
        : null,
      default_payment_terms: formData.get("default_payment_terms") as PaymentTerms,
      quote_number_prefix: formData.get("quote_number_prefix") as string,
      quote_number_next: Number(formData.get("quote_number_next")),
      invoice_number_prefix: formData.get("invoice_number_prefix") as string,
      invoice_number_next: Number(formData.get("invoice_number_next")),
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500">Defaults for new quotes and invoices going forward.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Default quote validity (days)"
          name="default_quote_validity_days"
          type="number"
          defaultValue={settings.default_quote_validity_days ?? ""}
          placeholder="No automatic expiry"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Default invoice payment terms
          </label>
          <select
            name="default_payment_terms"
            defaultValue={settings.default_payment_terms}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            {PAYMENT_TERMS_OPTIONS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Set your quote/invoice numbering once here. You can still change it later in Business
          Settings, but changing the starting number after you&apos;ve issued quotes or invoices only
          works safely if the new number is higher than anything already used.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="col-span-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            Quotes
          </p>
          <Field label="Prefix" name="quote_number_prefix" defaultValue={settings.quote_number_prefix} />
          <Field
            label="Starting number"
            name="quote_number_next"
            type="number"
            defaultValue={settings.quote_number_next}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="col-span-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            Invoices
          </p>
          <Field
            label="Prefix"
            name="invoice_number_prefix"
            defaultValue={settings.invoice_number_prefix}
          />
          <Field
            label="Starting number"
            name="invoice_number_next"
            type="number"
            defaultValue={settings.invoice_number_next}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <StepNav onBack={onBack} pending={pending} />
    </form>
  );
}
