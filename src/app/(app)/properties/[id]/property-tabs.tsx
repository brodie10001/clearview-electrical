"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Info,
  KeyRound,
  Zap,
  Users,
  FileImage,
  History,
} from "lucide-react";
import { clsx } from "clsx";
import { JobStatusBadge } from "@/components/ui/status-badge";
import { StatusToggle } from "./status-toggle";
import { AccessForm } from "./access-form";
import { ElectricalForm } from "./electrical-form";
import { ContactsSection } from "./contacts-section";
import type {
  PropertyDetailData,
  PropertyAccessData,
  PropertyElectricalData,
  PropertyContactData,
  PropertyDocumentData,
  PropertyJobData,
} from "./page";

const TABS = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "access", label: "Access", icon: KeyRound },
  { key: "electrical", label: "Electrical", icon: Zap },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "documents", label: "Documents", icon: FileImage },
  { key: "history", label: "History", icon: History },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PropertyTabs({
  property,
  propertyCreatedAtLabel,
  access,
  electrical,
  contacts,
  documents,
  jobs,
  allContacts,
}: {
  property: PropertyDetailData;
  propertyCreatedAtLabel: string;
  access: PropertyAccessData | null;
  electrical: PropertyElectricalData | null;
  contacts: PropertyContactData[];
  documents: PropertyDocumentData[];
  jobs: PropertyJobData[];
  allContacts: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{property.address}</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {property.customers?.name ?? "No customer"}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {property.property_type}
            </span>
            {property.status === "archived" ? (
              <span className="rounded-full bg-neutral-200 px-2.5 py-1 font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                Archived
              </span>
            ) : null}
          </div>
        </div>
        <StatusToggle propertyId={property.id} status={property.status} />
      </div>

      {property.customers ? (
        <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
          {property.customers.phone ? (
            <a href={`tel:${property.customers.phone}`} className="flex items-center gap-1.5 hover:text-amber-600">
              <Phone className="h-3.5 w-3.5" /> {property.customers.phone}
            </a>
          ) : null}
          {property.customers.email ? (
            <a href={`mailto:${property.customers.email}`} className="flex items-center gap-1.5 hover:text-amber-600">
              <Mail className="h-3.5 w-3.5" /> {property.customers.email}
            </a>
          ) : null}
          <Link href={`/customers/${property.customers.id}`} className="text-amber-600 hover:underline">
            View customer
          </Link>
        </div>
      ) : null}

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
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
        {tab === "overview" ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Added</span>
              <span className="text-neutral-900 dark:text-neutral-50">
                {propertyCreatedAtLabel}
              </span>
            </div>
            {property.gps_lat != null && property.gps_lng != null ? (
              <div className="flex justify-between">
                <span className="text-neutral-500">GPS</span>
                <a
                  href={`https://maps.google.com/?q=${property.gps_lat},${property.gps_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-600 hover:underline"
                >
                  {property.gps_lat.toFixed(5)}, {property.gps_lng.toFixed(5)}
                </a>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-neutral-500">Open jobs</span>
              <span className="text-neutral-900 dark:text-neutral-50">
                {jobs.filter((j) => !["Completed", "Closed"].includes(j.job_status)).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Documents on file</span>
              <span className="text-neutral-900 dark:text-neutral-50">{documents.length}</span>
            </div>
          </div>
        ) : null}

        {tab === "access" ? <AccessForm propertyId={property.id} access={access} /> : null}

        {tab === "electrical" ? (
          <ElectricalForm propertyId={property.id} electrical={electrical} />
        ) : null}

        {tab === "contacts" ? (
          <ContactsSection propertyId={property.id} contacts={contacts} allContacts={allContacts} />
        ) : null}

        {tab === "documents" ? (
          documents.length === 0 ? (
            <p className="text-sm text-neutral-500">No documents on file yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <FileImage className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {doc.caption || doc.type.replace("_", " ")}
                    </p>
                    <p className="text-xs capitalize text-neutral-500">
                      {doc.type.replace("_", " ")} · {doc.createdAtLabel}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "history" ? (
          jobs.length === 0 ? (
            <p className="text-sm text-neutral-500">No jobs recorded for this property yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {job.createdAtLabel}
                      </p>
                      {job.scheduledAtLabel ? (
                        <p className="text-xs text-neutral-500">Scheduled {job.scheduledAtLabel}</p>
                      ) : null}
                    </div>
                    <JobStatusBadge status={job.job_status} />
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
