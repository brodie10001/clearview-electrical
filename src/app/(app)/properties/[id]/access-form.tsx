"use client";

import { useActionState } from "react";
import { upsertPropertyAccess } from "../actions";
import type { PropertyAccessData } from "./page";

const FIELDS: { name: keyof PropertyAccessData; label: string }[] = [
  { name: "gate_code", label: "Gate code" },
  { name: "alarm_instructions", label: "Alarm instructions" },
  { name: "lockbox_location", label: "Lockbox location" },
  { name: "parking_instructions", label: "Parking instructions" },
  { name: "pets_notes", label: "Pets" },
  { name: "hazards_notes", label: "Hazards" },
  { name: "ceiling_access_notes", label: "Ceiling access" },
  { name: "roof_access_notes", label: "Roof access" },
  { name: "restricted_areas_notes", label: "Restricted areas" },
];

export function AccessForm({
  propertyId,
  access,
}: {
  propertyId: string;
  access: PropertyAccessData | null;
}) {
  const [, formAction, pending] = useActionState(async (_: null, formData: FormData) => {
    await upsertPropertyAccess(propertyId, formData);
    return null;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {field.label}
          </label>
          <textarea
            name={field.name}
            defaultValue={access?.[field.name] ?? ""}
            rows={field.name.endsWith("_notes") ? 2 : 1}
            className="resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save access info"}
      </button>
    </form>
  );
}
