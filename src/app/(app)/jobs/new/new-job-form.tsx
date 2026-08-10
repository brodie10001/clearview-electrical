"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createJob } from "../actions";
import { CreatePropertySheet } from "@/components/create-property-sheet";

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

const CREATE_NEW_PROPERTY = "__create_new_property__";

export function NewJobForm({
  properties: initialProperties,
  defaultPropertyId,
}: {
  properties: PropertyOption[];
  defaultPropertyId?: string;
}) {
  const [properties, setProperties] = useState(initialProperties);
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [propertySheetOpen, setPropertySheetOpen] = useState(false);
  // Bumped every time the sheet is opened so CreatePropertySheet remounts
  // fresh each time (a clean customer selection, not last time's leftovers).
  const [propertySheetKey, setPropertySheetKey] = useState(0);

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
    <>
      <form action={createJob} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Property
          </label>
          <select
            name="property_id"
            required
            value={propertyId}
            onChange={(e) => {
              if (e.target.value === CREATE_NEW_PROPERTY) {
                setPropertySheetKey((k) => k + 1);
                setPropertySheetOpen(true);
                return;
              }
              setPropertyId(e.target.value);
            }}
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
            <option value={CREATE_NEW_PROPERTY}>+ Create new property</option>
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

        <p className="text-xs text-neutral-500">
          You can schedule a visit for this job once it&apos;s created.
        </p>

        <button
          type="submit"
          disabled={!propertyId}
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          Create job
        </button>
      </form>

      <CreatePropertySheet
        key={propertySheetKey}
        open={propertySheetOpen}
        onClose={() => setPropertySheetOpen(false)}
        onCreated={(property) => {
          setProperties((prev) =>
            [
              ...prev,
              { id: property.id, address: property.address, customers: { name: property.customerName } },
            ].sort((a, b) => a.address.localeCompare(b.address)),
          );
          setPropertyId(property.id);
          setPropertySheetOpen(false);
        }}
      />
    </>
  );
}
