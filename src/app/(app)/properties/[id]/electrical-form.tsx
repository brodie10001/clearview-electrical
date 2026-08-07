"use client";

import { useActionState } from "react";
import { upsertPropertyElectrical } from "../actions";
import type { PropertyElectricalData } from "./page";

const TEXT_FIELDS: { name: keyof PropertyElectricalData; label: string }[] = [
  { name: "switchboard_location", label: "Switchboard location" },
  { name: "switchboard_brand", label: "Switchboard brand" },
  { name: "main_switch_rating", label: "Main switch rating" },
  { name: "consumer_mains_size", label: "Consumer mains size" },
  { name: "meter_number", label: "Meter number" },
  { name: "existing_rcds", label: "Existing RCDs" },
  { name: "existing_rcbos", label: "Existing RCBOs" },
  { name: "main_earth_location", label: "Main earth location" },
  { name: "men_location", label: "MEN location" },
];

const BOOL_FIELDS: { name: keyof PropertyElectricalData; label: string }[] = [
  { name: "solar_installed", label: "Solar installed" },
  { name: "battery_installed", label: "Battery installed" },
  { name: "generator_installed", label: "Generator installed" },
  { name: "surge_protection", label: "Surge protection" },
  { name: "ev_charger", label: "EV charger" },
];

export function ElectricalForm({
  propertyId,
  electrical,
}: {
  propertyId: string;
  electrical: PropertyElectricalData | null;
}) {
  const [, formAction, pending] = useActionState(async (_: null, formData: FormData) => {
    await upsertPropertyElectrical(propertyId, formData);
    return null;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Phase type
        </label>
        <select
          name="phase_type"
          defaultValue={electrical?.phase_type ?? ""}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="">Unknown</option>
          <option value="single_phase">Single phase</option>
          <option value="three_phase">Three phase</option>
        </select>
      </div>

      {TEXT_FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {field.label}
          </label>
          <input
            name={field.name}
            defaultValue={(electrical?.[field.name] as string) ?? ""}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BOOL_FIELDS.map((field) => (
          <label
            key={field.name}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          >
            <input
              type="checkbox"
              name={field.name}
              defaultChecked={Boolean(electrical?.[field.name])}
              className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
            />
            {field.label}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save electrical info"}
      </button>
    </form>
  );
}
