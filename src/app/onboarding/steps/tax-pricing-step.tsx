"use client";

import { useActionState } from "react";
import { updateOnboardingTaxPricing, type OnboardingStepResult } from "../actions";
import { Field, StepNav } from "./step-ui";
import type { OnboardingSettings } from "../page";

const initialState: OnboardingStepResult = { error: null };

export function TaxPricingStep({
  settings,
  standardRateTypeId,
  ratePerHour,
  onSaved,
  onBack,
}: {
  settings: OnboardingSettings;
  standardRateTypeId: string | null;
  ratePerHour: number;
  onSaved: (patch: Partial<OnboardingSettings>, newRate?: number) => void;
  onBack: (() => void) | null;
}) {
  const [state, formAction, pending] = useActionState(async (
    prevState: OnboardingStepResult,
    formData: FormData,
  ) => {
    const result = await updateOnboardingTaxPricing(prevState, formData);
    if (!result.error) {
      onSaved(
        {
          gst_registered: formData.get("gst_registered") === "on",
          default_material_markup_percent: Number(
            formData.get("default_material_markup_percent") || 0,
          ),
        },
        Number(formData.get("standard_rate_per_hour") || 0),
      );
    }
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        These become the starting defaults on every new quote -- still adjustable per quote later.
      </p>

      <input type="hidden" name="standard_rate_type_id" value={standardRateTypeId ?? ""} />

      <label className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          name="gst_registered"
          defaultChecked={settings.gst_registered}
          className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
        />
        GST registered — quotes will add 10% GST to the total
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Standard hourly labour rate ($)"
          name="standard_rate_per_hour"
          type="number"
          defaultValue={ratePerHour || ""}
        />
        <Field
          label="Default materials markup (%)"
          name="default_material_markup_percent"
          type="number"
          defaultValue={settings.default_material_markup_percent}
        />
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <StepNav onBack={onBack} pending={pending} />
    </form>
  );
}
