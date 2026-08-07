import { clsx } from "clsx";
import type { JobStatus, InvoiceStatus, QuoteStatus } from "@/types/database";

const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  New: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Quoting: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "Awaiting Approval": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  Scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Travelling: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  "On Site": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "On Hold": "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  Waiting: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  Completed: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Closed: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  "Not Required": "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Sent: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "Partially Paid": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Paid: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Overdue: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  "Written Off": "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        JOB_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        INVOICE_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Sent: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Accepted: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        QUOTE_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
