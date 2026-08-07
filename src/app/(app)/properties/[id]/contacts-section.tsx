"use client";

import { useState, useTransition } from "react";
import { Phone, Mail, X, UserPlus } from "lucide-react";
import {
  addPropertyContact,
  removePropertyContact,
  createAndAddPropertyContact,
} from "../actions";
import type { PropertyContactData } from "./page";
import type { PropertyContactRole } from "@/types/database";

const ROLES: PropertyContactRole[] = [
  "owner",
  "tenant",
  "property_manager",
  "builder",
  "site_supervisor",
  "accounts_contact",
  "emergency_contact",
];

export function ContactsSection({
  propertyId,
  contacts,
  allContacts,
}: {
  propertyId: string;
  contacts: PropertyContactData[];
  allContacts: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<"none" | "existing" | "new">("none");
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {contacts.length === 0 ? (
        <p className="text-sm text-neutral-500">No contacts linked to this property yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {contacts.map((pc) => (
            <li key={pc.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {pc.contacts?.name ?? "Unknown"}
                  </p>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {pc.role.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-neutral-500">
                  {pc.contacts?.phone ? (
                    <a href={`tel:${pc.contacts.phone}`} className="flex items-center gap-1 hover:text-amber-600">
                      <Phone className="h-3 w-3" /> {pc.contacts.phone}
                    </a>
                  ) : null}
                  {pc.contacts?.email ? (
                    <a href={`mailto:${pc.contacts.email}`} className="flex items-center gap-1 hover:text-amber-600">
                      <Mail className="h-3 w-3" /> {pc.contacts.email}
                    </a>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => startTransition(() => removePropertyContact(propertyId, pc.id))}
                className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                aria-label="Remove contact"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === "none" ? (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("existing")}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <UserPlus className="h-4 w-4" /> Link existing contact
          </button>
          <button
            onClick={() => setMode("new")}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <UserPlus className="h-4 w-4" /> Add new contact
          </button>
        </div>
      ) : null}

      {mode === "existing" ? (
        <form
          action={async (formData) => {
            await addPropertyContact(propertyId, formData);
            setMode("none");
          }}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        >
          <select
            name="contact_id"
            required
            defaultValue=""
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            <option value="" disabled>
              Select contact...
            </option>
            {allContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <RoleSelect />
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600">
              Add
            </button>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {mode === "new" ? (
        <form
          action={async (formData) => {
            await createAndAddPropertyContact(propertyId, formData);
            setMode("none");
          }}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        >
          <input
            name="name"
            required
            placeholder="Name"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <input
            name="phone"
            placeholder="Phone (optional)"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <input
            name="email"
            type="email"
            placeholder="Email (optional)"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <RoleSelect />
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600">
              Add
            </button>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function RoleSelect() {
  return (
    <select
      name="role"
      required
      defaultValue=""
      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
    >
      <option value="" disabled>
        Role...
      </option>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
