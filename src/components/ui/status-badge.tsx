import { clsx } from "clsx";
import { getJobStatusLabel } from "@/lib/job-status";
import type {
  JobStatus,
  InvoiceStatus,
  InvoiceRecordStatus,
  QuoteStatus,
  VisitStatus,
  ComplianceDocumentStatus,
  TestResult,
} from "@/types/database";

const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  New: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Quoting: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "Awaiting Approval": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  "Ready to Schedule": "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  Scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "On Site": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
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

export function JobStatusBadge({
  status,
  invoiceStatus,
}: {
  status: JobStatus;
  // Optional -- callers that don't have it fall back to the plain
  // job_status label, same as before this existed.
  invoiceStatus?: InvoiceStatus;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        JOB_STATUS_STYLES[status],
      )}
    >
      {invoiceStatus ? getJobStatusLabel(status, invoiceStatus) : status}
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

const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  Scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "In Progress": "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  Completed: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Rescheduled: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        VISIT_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

const INVOICE_RECORD_STATUS_STYLES: Record<InvoiceRecordStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Sent: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "Partially Paid": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Paid: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Overdue: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Void: "bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800 dark:text-neutral-500",
  "Written Off": "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export function InvoiceRecordStatusBadge({ status }: { status: InvoiceRecordStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        INVOICE_RECORD_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

const COMPLIANCE_DOCUMENT_STATUS_STYLES: Record<ComplianceDocumentStatus, string> = {
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Issued: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Lodged: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

export function ComplianceDocumentStatusBadge({ status }: { status: ComplianceDocumentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        COMPLIANCE_DOCUMENT_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

const TEST_RESULT_STYLES: Record<TestResult, string> = {
  Pass: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Fail: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  "N/A": "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export function TestResultBadge({ result }: { result: TestResult }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TEST_RESULT_STYLES[result],
      )}
    >
      {result}
    </span>
  );
}
