"use client";

import { useActionState } from "react";
import { updateOnboardingPaymentDetails, type OnboardingStepResult } from "../actions";
import { Field, Textarea, StepNav } from "./step-ui";
import type { OnboardingSettings } from "../page";

const initialState: OnboardingStepResult = { error: null };

export function PaymentDetailsStep({
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
    const result = await updateOnboardingPaymentDetails(prevState, formData);
    if (!result.error) {
      onSaved({
        bank_bsb: (formData.get("bank_bsb") as string) || null,
        bank_account_name: (formData.get("bank_account_name") as string) || null,
        bank_account_number: (formData.get("bank_account_number") as string) || null,
        payment_instructions: (formData.get("payment_instructions") as string) || null,
      });
    }
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Shown on invoices so customers know how to pay you. Optional -- fine to skip and fill in
        later from Business Settings.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="BSB" name="bank_bsb" defaultValue={settings.bank_bsb} />
        <Field
          label="Account name"
          name="bank_account_name"
          defaultValue={settings.bank_account_name}
        />
        <Field
          label="Account number"
          name="bank_account_number"
          defaultValue={settings.bank_account_number}
        />
      </div>
      <Textarea
        label="Payment instructions (optional)"
        name="payment_instructions"
        defaultValue={settings.payment_instructions}
      />

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <StepNav onBack={onBack} pending={pending} nextLabel="Next" />
    </form>
  );
}
