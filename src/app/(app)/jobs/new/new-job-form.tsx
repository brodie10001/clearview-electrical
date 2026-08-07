"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createJob } from "../actions";

interface PropertyOption {
  id: string;
  address: string;
  customers: { name: string } | null;
}

interface ContactOption {
  id: string;
  name: string;
  role: string;
}

export function NewJobForm({
  properties,
  defaultPropertyId,
}: {
  properties: PropertyOption[];
  defaultPropertyId?: string;
}) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  useEffect(() => {
    if (!propertyId) return;
    const supabase = createClient();
    supabase
      .from("property_contacts")
      .select("role, contacts(id, name)")
      .eq("property_id", propertyId)
      .returns<{ role: string; contacts: { id: string; name: string } | null }[]>()
      .then(({ data }) => {
        setContacts(
          (data ?? [])
            .filter((pc) => pc.contacts)
            .map((pc) => ({ id: pc.contacts!.id, name: pc.contacts!.name, role: pc.role })),
        );
      });
  }, [propertyId]);

  return (
    <form action={createJob} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Property
        </label>
        <select
          name="property_id"
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="" disabled>
            Select a property...
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address}
              {p.customers?.name ? ` — ${p.customers.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Primary contact (optional)
        </label>
        <select
          name="primary_contact_id"
          disabled={!propertyId}
          defaultValue=""
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <option value="">None</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.role.replace("_", " ")})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Scheduled time (optional)
        </label>
        <input
          type="datetime-local"
          name="scheduled_at"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>

      <button
        type="submit"
        disabled={!propertyId}
        className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        Create job
      </button>
    </form>
  );
}
