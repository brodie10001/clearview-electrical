"use client";

import { useState, useTransition } from "react";
import { updateJobStatus } from "../actions";
import { InvoiceStatusBadge } from "@/components/ui/status-badge";
import type { JobStatus, InvoiceStatus } from "@/types/database";

const JOB_STATUSES: JobStatus[] = [
  "New",
  "Quoting",
  "Awaiting Approval",
  "Ready to Schedule",
  "Scheduled",
  "On Site",
  "Completed",
  "Closed",
];

export function JobControls({
  jobId,
  jobStatus,
  invoiceStatus,
}: {
  jobId: string;
  jobStatus: JobStatus;
  invoiceStatus: InvoiceStatus;
}) {
  const [status, setStatus] = useState(jobStatus);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">Job status</label>
        <select
          value={status}
          onChange={(e) => {
            const value = e.target.value as JobStatus;
            const previous = status;
            setStatus(value);
            setError(null);
            startTransition(async () => {
              try {
                await updateJobStatus(jobId, value);
              } catch (err) {
                setStatus(previous);
                setError(err instanceof Error ? err.message : "Failed to update status.");
              }
            });
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500">
          Invoice status <span className="text-neutral-400">(from invoices)</span>
        </label>
        <div className="flex h-[38px] items-center">
          <InvoiceStatusBadge status={invoiceStatus} />
        </div>
      </div>
    </div>
  );
}
