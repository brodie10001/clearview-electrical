"use client";

import { useState, useTransition } from "react";
import { updateJobStatus, updateInvoiceStatus, updateScheduledAt } from "../actions";
import type { JobStatus, InvoiceStatus } from "@/types/database";

const JOB_STATUSES: JobStatus[] = [
  "New",
  "Quoting",
  "Awaiting Approval",
  "Scheduled",
  "Travelling",
  "On Site",
  "On Hold",
  "Waiting",
  "Completed",
  "Closed",
];

const INVOICE_STATUSES: InvoiceStatus[] = [
  "Not Required",
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Written Off",
];

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function JobControls({
  jobId,
  jobStatus,
  invoiceStatus,
  scheduledAt,
}: {
  jobId: string;
  jobStatus: JobStatus;
  invoiceStatus: InvoiceStatus;
  scheduledAt: string | null;
}) {
  const [status, setStatus] = useState(jobStatus);
  const [invoice, setInvoice] = useState(invoiceStatus);
  const [scheduled, setScheduled] = useState(toLocalInputValue(scheduledAt));
  const [, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Job status</label>
        <select
          value={status}
          onChange={(e) => {
            const value = e.target.value as JobStatus;
            setStatus(value);
            startTransition(() => updateJobStatus(jobId, value));
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Invoice status</label>
        <select
          value={invoice}
          onChange={(e) => {
            const value = e.target.value as InvoiceStatus;
            setInvoice(value);
            startTransition(() => updateInvoiceStatus(jobId, value));
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Scheduled</label>
        <input
          type="datetime-local"
          value={scheduled}
          onChange={(e) => {
            const value = e.target.value;
            setScheduled(value);
            startTransition(() => updateScheduledAt(jobId, value || null));
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
      </div>
    </div>
  );
}
