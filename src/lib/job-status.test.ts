import { describe, it, expect } from "vitest";
import { getJobStatusLabel, isJobFinanciallyComplete, isJobOpen } from "./job-status";
import type { JobStatus, InvoiceStatus } from "@/types/database";

describe("getJobStatusLabel", () => {
  it("passes through non-Completed job statuses unchanged", () => {
    expect(getJobStatusLabel("Scheduled", "Not Required")).toBe("Scheduled");
    expect(getJobStatusLabel("On Site", "Draft")).toBe("On Site");
  });

  it("shows a Completed job as waiting on invoice before one's sent", () => {
    expect(getJobStatusLabel("Completed", "Not Required")).toBe(
      "Job Complete — Waiting on Invoice",
    );
    expect(getJobStatusLabel("Completed", "Draft")).toBe("Job Complete — Waiting on Invoice");
  });

  it("shows a Completed job as awaiting payment once invoiced", () => {
    expect(getJobStatusLabel("Completed", "Sent")).toBe("Awaiting Payment");
    expect(getJobStatusLabel("Completed", "Overdue")).toBe("Awaiting Payment");
  });

  it("shows Completed once paid or written off", () => {
    expect(getJobStatusLabel("Completed", "Paid")).toBe("Completed");
    expect(getJobStatusLabel("Completed", "Written Off")).toBe("Completed");
  });
});

describe("isJobFinanciallyComplete", () => {
  it("Closed is always financially complete regardless of invoice status", () => {
    expect(isJobFinanciallyComplete("Closed", "Sent")).toBe(true);
    expect(isJobFinanciallyComplete("Closed", "Draft")).toBe(true);
  });

  it("a Completed job is not financially complete until Paid or Written Off", () => {
    expect(isJobFinanciallyComplete("Completed", "Sent")).toBe(false);
    expect(isJobFinanciallyComplete("Completed", "Partially Paid")).toBe(false);
    expect(isJobFinanciallyComplete("Completed", "Paid")).toBe(true);
    expect(isJobFinanciallyComplete("Completed", "Written Off")).toBe(true);
  });

  it("a job that isn't Completed or Closed is never financially complete", () => {
    expect(isJobFinanciallyComplete("Scheduled", "Paid")).toBe(false);
  });
});

describe("isJobOpen", () => {
  const preCompletion: JobStatus[] = [
    "New",
    "Quoting",
    "Awaiting Approval",
    "Ready to Schedule",
    "Scheduled",
    "On Site",
  ];

  it("every pre-completion job_status is always open, regardless of invoice status", () => {
    for (const status of preCompletion) {
      expect(isJobOpen(status, "Not Required")).toBe(true);
      expect(isJobOpen(status, "Paid")).toBe(true);
    }
  });

  it("a Completed job with unpaid invoices stays open -- doesn't vanish from the Open filter", () => {
    const unsettled: InvoiceStatus[] = ["Not Required", "Draft", "Sent", "Overdue", "Partially Paid"];
    for (const invoiceStatus of unsettled) {
      expect(isJobOpen("Completed", invoiceStatus)).toBe(true);
    }
  });

  it("a Completed job moves to closed/not-open once every invoice is settled", () => {
    expect(isJobOpen("Completed", "Paid")).toBe(false);
    expect(isJobOpen("Completed", "Written Off")).toBe(false);
  });

  it("Closed jobs are never open", () => {
    expect(isJobOpen("Closed", "Paid")).toBe(false);
    expect(isJobOpen("Closed", "Sent")).toBe(false);
  });
});
