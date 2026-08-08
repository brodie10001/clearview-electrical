"use client";

import { useActionState } from "react";
import { updateBusinessSettings } from "./actions";
import { LogoUploader } from "./logo-uploader";
import { PAYMENT_TERMS_OPTIONS } from "@/lib/payment-terms";
import type { BusinessSettings } from "./page";

export function BrandingForm({
  settings,
  canEdit,
}: {
  settings: BusinessSettings;
  canEdit: boolean;
}) {
  const [, formAction, pending] = useActionState(async (_: null, formData: FormData) => {
    await updateBusinessSettings(formData);
    return null;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset disabled={!canEdit} className="flex flex-col gap-6 disabled:opacity-70">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Logos
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LogoUploader kind="logo" label="Logo" currentUrl={settings.logo_url} />
            <LogoUploader
              kind="light"
              label="Light logo (for dark backgrounds)"
              currentUrl={settings.logo_light_url}
            />
            <LogoUploader
              kind="dark"
              label="Dark logo (for light backgrounds)"
              currentUrl={settings.logo_dark_url}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Trading name" name="trading_name" defaultValue={settings.trading_name} />
          <Field label="ABN" name="abn" defaultValue={settings.abn} />
          <Field
            label="License number (optional)"
            name="license_number"
            defaultValue={settings.license_number}
          />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Brand colours
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ColorField label="Primary" name="primary_color" defaultValue={settings.primary_color} />
            <ColorField
              label="Secondary"
              name="secondary_color"
              defaultValue={settings.secondary_color}
            />
            <ColorField label="Accent" name="accent_color" defaultValue={settings.accent_color} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Company font
            </label>
            <select
              name="company_font"
              defaultValue={settings.company_font}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Times-Roman">Times Roman</option>
              <option value="Courier">Courier</option>
            </select>
            <p className="text-xs text-neutral-500">
              Used on generated PDFs. Limited to these three for reliable PDF rendering.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Default material markup %
            </label>
            <input
              name="default_material_markup_percent"
              type="number"
              step="0.1"
              min="0"
              defaultValue={settings.default_material_markup_percent}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <p className="text-xs text-neutral-500">Pre-fills new material lines on quotes.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Default payment terms
          </label>
          <select
            name="default_payment_terms"
            defaultValue={settings.default_payment_terms}
            className="max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            {PAYMENT_TERMS_OPTIONS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            Pre-fills new invoices, unless a customer has their own override.
          </p>
        </div>

        <label className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            name="gst_registered"
            defaultChecked={settings.gst_registered}
            className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
          />
          GST registered — quotes will add 10% GST to the total
        </label>

        <Textarea label="Quote header" name="quote_header" defaultValue={settings.quote_header} />
        <Textarea
          label="Invoice footer"
          name="invoice_footer"
          defaultValue={settings.invoice_footer}
        />
        <Textarea
          label="Email signature"
          name="email_signature"
          defaultValue={settings.email_signature}
        />

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save business settings"}
        </button>
      </fieldset>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
      />
    </div>
  );
}

function ColorField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          defaultValue={defaultValue}
          onChange={(e) => {
            const textInput = e.currentTarget.nextElementSibling as HTMLInputElement | null;
            if (textInput) textInput.value = e.currentTarget.value;
          }}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
        />
        <input
          name={name}
          defaultValue={defaultValue}
          pattern="^#[0-9a-fA-F]{6}$"
          onChange={(e) => {
            const colorInput = e.currentTarget.previousElementSibling as HTMLInputElement | null;
            if (colorInput && /^#[0-9a-fA-F]{6}$/.test(e.currentTarget.value)) {
              colorInput.value = e.currentTarget.value;
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        className="resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
      />
    </div>
  );
}
