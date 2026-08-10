"use client";

import { CheckCircle2 } from "lucide-react";
import type { OnboardingSettings } from "../page";

export function FinishStep({
  settings,
  onBack,
  onFinish,
}: {
  settings: OnboardingSettings;
  onBack: (() => void) | null;
  onFinish: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500">
        You&apos;re set up. Everything below stays editable later from Business Settings.
      </p>

      <dl className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
        <SummaryRow label="Trading name" value={settings.trading_name || "Not set"} />
        <SummaryRow
          label="Contact"
          value={[settings.business_email, settings.business_phone].filter(Boolean).join(" · ") || "Not set"}
        />
        <SummaryRow label="GST registered" value={settings.gst_registered ? "Yes" : "No"} />
        <SummaryRow
          label="Materials markup"
          value={`${settings.default_material_markup_percent}%`}
        />
        <SummaryRow
          label="Quote numbering"
          value={`${settings.quote_number_prefix}${String(settings.quote_number_next).padStart(4, "0")} onward`}
        />
        <SummaryRow
          label="Invoice numbering"
          value={`${settings.invoice_number_prefix}${String(settings.invoice_number_next).padStart(4, "0")} onward`}
        />
        <SummaryRow
          label="Payment details"
          value={settings.bank_bsb || settings.bank_account_number ? "Added" : "Not set"}
        />
      </dl>

      <form action={onFinish}>
        <div className="mt-2 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            Setup Complete → Enter Dashboard
          </button>
        </div>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900 dark:text-neutral-50">{value}</dd>
    </div>
  );
}
