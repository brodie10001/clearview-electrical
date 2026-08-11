import type { JobStatus, InvoiceStatus } from "@/types/database";

// job_status alone can't tell a contractor what to do next once the
// physical work wraps up -- "Completed" is silent on whether an invoice
// even exists yet. This derives the actual contractor-facing label by
// combining job_status with the job's invoice_status (itself already
// derived live from real invoice/payment records via recompute_job_invoice_status),
// rather than adding new job_status enum values or duplicating what
// invoice_status already tracks financially. job_status itself never
// changes because of this -- it's a display-only projection.
export function getJobStatusLabel(jobStatus: JobStatus, invoiceStatus: InvoiceStatus): string {
  if (jobStatus !== "Completed") return jobStatus;

  switch (invoiceStatus) {
    case "Not Required":
    case "Draft":
      return "Job Complete — Waiting on Invoice";
    case "Sent":
    case "Overdue":
      return "Awaiting Payment";
    case "Partially Paid":
      return "Partially Paid";
    case "Paid":
    case "Written Off":
    default:
      return "Completed";
  }
}

// Statuses that precede the automatic "all visits done" transition -- a job
// sitting in one of these is unambiguously still open work.
const PRE_COMPLETION_STATUSES = new Set<JobStatus>([
  "New",
  "Quoting",
  "Awaiting Approval",
  "Ready to Schedule",
  "Scheduled",
  "On Site",
]);

// "Completed" (job_status) means the physical work is done -- it says
// nothing about whether the customer has paid. A job is only *financially*
// complete once every invoice against it is settled: fully paid, or
// written off. invoice_status already aggregates across every invoice on
// the job (see recompute_job_invoice_status), so this never looks at a
// single invoice in isolation -- multi-invoice/progress-billed jobs stay
// open until every stage is actually settled. Closed is always final: the
// manual Close action is already gated (see updateJobStatus) so it can only
// be reached once invoice_status is Paid or Not Required.
export function isJobFinanciallyComplete(jobStatus: JobStatus, invoiceStatus: InvoiceStatus): boolean {
  if (jobStatus === "Closed") return true;
  if (jobStatus !== "Completed") return false;
  return invoiceStatus === "Paid" || invoiceStatus === "Written Off";
}

// The Jobs list's "Open" vs "Completed" filter, and anywhere else the app
// needs to know whether a job still belongs in the active/open workflow --
// physically finished but unpaid work must stay open, not disappear into
// the Completed filter the moment the last visit wraps up.
export function isJobOpen(jobStatus: JobStatus, invoiceStatus: InvoiceStatus): boolean {
  if (PRE_COMPLETION_STATUSES.has(jobStatus)) return true;
  if (jobStatus === "Completed") return !isJobFinanciallyComplete(jobStatus, invoiceStatus);
  return false;
}
