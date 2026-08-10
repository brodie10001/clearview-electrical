"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import { updateOnboardingBranding, type OnboardingStepResult } from "../actions";
import { LogoUploader } from "@/app/(app)/settings/business/logo-uploader";
import { StepNav } from "./step-ui";
import type { OnboardingSettings } from "../page";
import type { CompanyFont } from "@/types/database";

const BrandingLivePreview = dynamic(
  () => import("./branding-live-preview").then((m) => m.BrandingLivePreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center text-sm text-neutral-400">
        Loading preview...
      </div>
    ),
  },
);

const initialState: OnboardingStepResult = { error: null };

export function BrandingStep({
  settings,
  onSaved,
  onBack,
}: {
  settings: OnboardingSettings;
  onSaved: (patch: Partial<OnboardingSettings>) => void;
  onBack: (() => void) | null;
}) {
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondary_color);
  const [accentColor, setAccentColor] = useState(settings.accent_color);
  const [font, setFont] = useState<CompanyFont>(settings.company_font);

  const [state, formAction, pending] = useActionState(async (
    prevState: OnboardingStepResult,
    formData: FormData,
  ) => {
    const result = await updateOnboardingBranding(prevState, formData);
    if (!result.error) {
      onSaved({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        company_font: font,
      });
    }
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500">
        This is how your quotes and invoices will look. Changes here update the preview live.
      </p>

      <LogoUploader kind="logo" label="Logo" currentUrl={settings.logo_url} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorField label="Primary" name="primary_color" value={primaryColor} onChange={setPrimaryColor} />
        <ColorField
          label="Secondary"
          name="secondary_color"
          value={secondaryColor}
          onChange={setSecondaryColor}
        />
        <ColorField label="Accent" name="accent_color" value={accentColor} onChange={setAccentColor} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Company font
        </label>
        <select
          name="company_font"
          value={font}
          onChange={(e) => setFont(e.target.value as CompanyFont)}
          className="max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="Helvetica">Helvetica</option>
          <option value="Times-Roman">Times Roman</option>
          <option value="Courier">Courier</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <BrandingLivePreview
          settings={{
            trading_name: settings.trading_name,
            abn: settings.abn,
            license_number: settings.license_number,
            logo_url: settings.logo_url,
            logo_dark_url: null,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor,
            company_font: font,
            quote_header: null,
            quote_terms: null,
          }}
        />
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <StepNav onBack={onBack} pending={pending} />
    </form>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-neutral-300 dark:border-neutral-700"
        />
        <input
          name={name}
          value={value}
          pattern="^#[0-9a-fA-F]{6}$"
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
    </div>
  );
}
