"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { updateTestThresholds } from "./actions";
import type { BusinessSettings } from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

// Pass/fail suggestion thresholds for the test sheet. Deliberately stored
// unconfirmed until an owner/admin explicitly ticks the box below --
// test_thresholds_confirmed gates whether the test sheet suggests
// anything at all, so an unreviewed provisional number can never silently
// pass a failed circuit.
export function TestThresholdsForm({
  settings,
  canEdit,
}: {
  settings: BusinessSettings;
  canEdit: boolean;
}) {
  const [confirmed, setConfirmed] = useState(settings.test_thresholds_confirmed);
  const [saving, setSaving] = useState(false);

  return (
    <form
      action={async (formData) => {
        setSaving(true);
        await updateTestThresholds(formData);
        setSaving(false);
      }}
      className="flex flex-col gap-4"
    >
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        The test sheet never suggests a pass/fail result until these are confirmed below. These
        are provisional defaults, not confirmed regulatory figures -- review them against AS/NZS
        3000 before confirming. Earth continuity and fault loop impedance have no threshold here
        deliberately: both depend on run length, cable size, and (for fault loop) protective
        device rating, so a single number would be wrong more often than not.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Insulation resistance min (MΩ)</label>
          <input
            type="number"
            step="any"
            min="0"
            name="insulation_resistance_min_mohm"
            defaultValue={settings.insulation_resistance_min_mohm ?? ""}
            disabled={!canEdit}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">RCD trip time max (ms)</label>
          <input
            type="number"
            step="any"
            min="0"
            name="rcd_trip_time_max_ms"
            defaultValue={settings.rcd_trip_time_max_ms ?? ""}
            disabled={!canEdit}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">RCD trip current max (mA)</label>
          <input
            type="number"
            step="any"
            min="0"
            name="rcd_trip_current_max_ma"
            defaultValue={settings.rcd_trip_current_max_ma ?? ""}
            disabled={!canEdit}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          name="test_thresholds_confirmed"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={!canEdit}
          className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700"
        />
        I&apos;ve reviewed these figures and confirm they&apos;re correct to use as suggestions
      </label>

      {canEdit ? (
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save thresholds"}
        </button>
      ) : null}
    </form>
  );
}
