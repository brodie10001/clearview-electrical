"use client";

import { useState } from "react";
import type { OnboardingSettings } from "./page";
import { skipOnboarding, completeOnboarding } from "./actions";
import { IdentityStep } from "./steps/identity-step";
import { BrandingStep } from "./steps/branding-step";
import { TaxPricingStep } from "./steps/tax-pricing-step";
import { QuotesInvoicesStep } from "./steps/quotes-invoices-step";
import { PaymentDetailsStep } from "./steps/payment-details-step";
import { FinishStep } from "./steps/finish-step";

const STEP_LABELS = [
  "Business identity",
  "Branding",
  "Tax & pricing",
  "Quotes & invoices",
  "Payment details",
  "Finish",
];

export function OnboardingWizard({
  settings: initialSettings,
  standardRateTypeId,
  standardRatePerHour,
}: {
  settings: OnboardingSettings;
  standardRateTypeId: string | null;
  standardRatePerHour: number;
}) {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState(initialSettings);
  const [rate, setRate] = useState(standardRatePerHour);

  // Each step's save revalidates this route, so Next.js re-renders this
  // page with a fresh `settings` prop -- most importantly after the logo
  // uploader (which persists directly, outside this wizard's own actions)
  // changes it. Adopt the new server value the same way jobs-list.tsx
  // syncs prop changes into local state, without an effect.
  const [syncedFrom, setSyncedFrom] = useState(initialSettings);
  if (initialSettings !== syncedFrom) {
    setSyncedFrom(initialSettings);
    setSettings(initialSettings);
  }

  function advance() {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            Step {step} of {STEP_LABELS.length}
          </p>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {STEP_LABELS[step - 1]}
          </h1>
        </div>
        {step < STEP_LABELS.length ? (
          <button
            type="button"
            onClick={() => skipOnboarding()}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Skip for now
          </button>
        ) : null}
      </div>

      <div className="flex gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${
              i < step ? "bg-amber-500" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        {step === 1 ? (
          <IdentityStep
            settings={settings}
            onSaved={(patch) => {
              setSettings((s) => ({ ...s, ...patch }));
              advance();
            }}
            onBack={null}
          />
        ) : null}
        {step === 2 ? (
          <BrandingStep
            settings={settings}
            onSaved={(patch) => {
              setSettings((s) => ({ ...s, ...patch }));
              advance();
            }}
            onBack={back}
          />
        ) : null}
        {step === 3 ? (
          <TaxPricingStep
            settings={settings}
            standardRateTypeId={standardRateTypeId}
            ratePerHour={rate}
            onSaved={(patch, newRate) => {
              setSettings((s) => ({ ...s, ...patch }));
              if (newRate !== undefined) setRate(newRate);
              advance();
            }}
            onBack={back}
          />
        ) : null}
        {step === 4 ? (
          <QuotesInvoicesStep
            settings={settings}
            onSaved={(patch) => {
              setSettings((s) => ({ ...s, ...patch }));
              advance();
            }}
            onBack={back}
          />
        ) : null}
        {step === 5 ? (
          <PaymentDetailsStep
            settings={settings}
            onSaved={(patch) => {
              setSettings((s) => ({ ...s, ...patch }));
              advance();
            }}
            onBack={back}
          />
        ) : null}
        {step === 6 ? (
          <FinishStep
            settings={settings}
            onBack={back}
            onFinish={() => completeOnboarding()}
          />
        ) : null}
      </div>
    </div>
  );
}
