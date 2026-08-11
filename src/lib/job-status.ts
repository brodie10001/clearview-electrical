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
    case "Partially Paid":
    case "Overdue":
      return "Awaiting Payment";
    case "Paid":
    case "Written Off":
    default:
      return "Completed";
  }
}
