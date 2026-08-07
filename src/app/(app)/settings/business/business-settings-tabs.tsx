"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Palette, Clock } from "lucide-react";
import { BrandingForm } from "./branding-form";
import { LabourRatesSection } from "./labour-rates-section";
import type { BusinessSettings, LabourRateType } from "./page";

const TABS = [
  { key: "branding", label: "Branding & Details", icon: Palette },
  { key: "rates", label: "Labour Rates", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function BusinessSettingsTabs({
  settings,
  rateTypes,
  canEdit,
}: {
  settings: BusinessSettings;
  rateTypes: LabourRateType[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("branding");

  return (
    <div className="flex flex-col gap-4">
      {!canEdit ? (
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800">
          Only owners and admins can edit business settings. You can view them here.
        </p>
      ) : null}

      <div className="flex gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        {tab === "branding" ? <BrandingForm settings={settings} canEdit={canEdit} /> : null}
        {tab === "rates" ? (
          <LabourRatesSection rateTypes={rateTypes} canEdit={canEdit} />
        ) : null}
      </div>
    </div>
  );
}
