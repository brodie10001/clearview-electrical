"use client";

import { useActionState } from "react";
import { updateOnboardingIdentity, type OnboardingStepResult } from "../actions";
import { Field, StepNav } from "./step-ui";
import type { OnboardingSettings } from "../page";

const initialState: OnboardingStepResult = { error: null };

export function IdentityStep({
  settings,
  onSaved,
  onBack,
}: {
  settings: OnboardingSettings;
  onSaved: (patch: Partial<OnboardingSettings>) => void;
  onBack: (() => void) | null;
}) {
  const [state, formAction, pending] = useActionState(async (
    prevState: OnboardingStepResult,
    formData: FormData,
  ) => {
    const result = await updateOnboardingIdentity(prevState, formData);
    if (!result.error) {
      onSaved({
        trading_name: (formData.get("trading_name") as string) || null,
        abn: (formData.get("abn") as string) || null,
        license_number: (formData.get("license_number") as string) || null,
        business_email: (formData.get("business_email") as string) || null,
        business_phone: (formData.get("business_phone") as string) || null,
        business_address: (formData.get("business_address") as string) || null,
      });
    }
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        The basics that appear on your quotes, invoices, and paperwork.
      </p>

      <Field label="Trading name" name="trading_name" defaultValue={settings.trading_name} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ABN (optional)" name="abn" defaultValue={settings.abn} />
        <Field
          label="Licence number (optional)"
          name="license_number"
          defaultValue={settings.license_number}
          placeholder="Don't have one yet? Leave blank"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Business email"
          name="business_email"
          type="email"
          defaultValue={settings.business_email}
        />
        <Field label="Business phone" name="business_phone" defaultValue={settings.business_phone} />
      </div>
      <Field label="Business address" name="business_address" defaultValue={settings.business_address} />

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <StepNav onBack={onBack} pending={pending} />
    </form>
  );
}
