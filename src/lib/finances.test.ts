import { describe, it, expect } from "vitest";
import {
  resolveDateRange,
  getFinancialYearRange,
  computeFinancesSummary,
  isOutstandingInvoiceStatus,
  bucketRevenueByMonth,
  round2,
} from "./finances";

describe("resolveDateRange", () => {
  it("this-month spans the full calendar month", () => {
    expect(resolveDateRange("this-month", "2026-08-14")).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("last-month rolls back across a year boundary in January", () => {
    expect(resolveDateRange("last-month", "2026-01-15")).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });

  it("last-month handles a shorter month correctly (Feb non-leap)", () => {
    expect(resolveDateRange("last-month", "2027-03-10")).toEqual({
      start: "2027-02-01",
      end: "2027-02-28",
    });
  });

  it("custom passes through the given bounds", () => {
    expect(
      resolveDateRange("custom", "2026-08-14", { from: "2026-01-01", to: "2026-06-30" }),
    ).toEqual({ start: "2026-01-01", end: "2026-06-30" });
  });

  it("all-time is an open range", () => {
    expect(resolveDateRange("all-time", "2026-08-14")).toEqual({ start: null, end: null });
  });
});

describe("getFinancialYearRange", () => {
  it("a date in the second half of the calendar year starts the FY that same July", () => {
    expect(getFinancialYearRange("2026-08-14")).toEqual({
      start: "2026-07-01",
      end: "2027-06-30",
    });
  });

  it("a date in the first half of the calendar year belongs to the FY that started the prior July", () => {
    expect(getFinancialYearRange("2026-03-01")).toEqual({
      start: "2025-07-01",
      end: "2026-06-30",
    });
  });

  it("July 1st itself is the first day of the new FY, not the old one", () => {
    expect(getFinancialYearRange("2026-07-01")).toEqual({
      start: "2026-07-01",
      end: "2027-06-30",
    });
  });
});

describe("round2", () => {
  it("fixes floating point drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it("normalizes -0 to 0", () => {
    expect(Object.is(round2(-0), 0)).toBe(true);
  });
});

describe("isOutstandingInvoiceStatus", () => {
  it("Sent, Partially Paid, and Overdue count as outstanding", () => {
    expect(isOutstandingInvoiceStatus("Sent")).toBe(true);
    expect(isOutstandingInvoiceStatus("Partially Paid")).toBe(true);
    expect(isOutstandingInvoiceStatus("Overdue")).toBe(true);
  });

  it("Draft, Paid, and Void do not count as outstanding", () => {
    expect(isOutstandingInvoiceStatus("Draft")).toBe(false);
    expect(isOutstandingInvoiceStatus("Paid")).toBe(false);
    expect(isOutstandingInvoiceStatus("Void")).toBe(false);
  });
});

describe("computeFinancesSummary", () => {
  it("excludes Draft and Void invoices from revenue", () => {
    const summary = computeFinancesSummary({
      invoicesInRange: [
        {
          id: "1",
          job_id: "job1",
          amount: 500,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Sent",
          gst_applied: false,
          paid_amount: 0,
        },
        {
          id: "2",
          job_id: "job1",
          amount: 300,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Draft",
          gst_applied: false,
          paid_amount: 0,
        },
        {
          id: "3",
          job_id: "job1",
          amount: 200,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Void",
          gst_applied: false,
          paid_amount: 0,
        },
      ],
      paymentsInRangeTotal: 0,
      expensesInRange: [],
      jobDirectCosts: new Map(),
    });

    expect(summary.revenueInvoiced).toBe(500);
  });

  it("computes GST collected as amount/11 only for GST-applied invoices", () => {
    const summary = computeFinancesSummary({
      invoicesInRange: [
        {
          id: "1",
          job_id: "job1",
          amount: 1100,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Sent",
          gst_applied: true,
          paid_amount: 0,
        },
        {
          id: "2",
          job_id: "job1",
          amount: 1100,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Sent",
          gst_applied: false,
          paid_amount: 0,
        },
      ],
      paymentsInRangeTotal: 0,
      expensesInRange: [],
      jobDirectCosts: new Map(),
    });

    expect(summary.gstCollected).toBe(100);
  });

  it("only counts job_id-null expenses as business expenses (overhead)", () => {
    const summary = computeFinancesSummary({
      invoicesInRange: [],
      paymentsInRangeTotal: 0,
      expensesInRange: [
        { amount: 100, gst_amount: 0, gst_included: false, job_id: null, date: "2026-08-01" },
        { amount: 250, gst_amount: 0, gst_included: false, job_id: "job1", date: "2026-08-01" },
      ],
      jobDirectCosts: new Map(),
    });

    expect(summary.businessExpenses).toBe(100);
  });

  it("returns null gross profit rather than a fabricated zero when there's no cost data for real revenue", () => {
    const summary = computeFinancesSummary({
      invoicesInRange: [
        {
          id: "1",
          job_id: "job1",
          amount: 1000,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Sent",
          gst_applied: false,
          paid_amount: 0,
        },
      ],
      paymentsInRangeTotal: 0,
      expensesInRange: [],
      jobDirectCosts: new Map(),
    });

    expect(summary.grossProfit).toBeNull();
  });

  it("computes real gross profit once job cost data exists", () => {
    const summary = computeFinancesSummary({
      invoicesInRange: [
        {
          id: "1",
          job_id: "job1",
          amount: 1000,
          issue_date: "2026-08-01",
          due_date: "2026-08-08",
          status: "Sent",
          gst_applied: false,
          paid_amount: 0,
        },
      ],
      paymentsInRangeTotal: 0,
      expensesInRange: [],
      jobDirectCosts: new Map([["job1", 400]]),
    });

    expect(summary.grossProfit).toBe(600);
  });
});

describe("bucketRevenueByMonth", () => {
  it("produces a bucket for every month in range, including $0 months", () => {
    const buckets = bucketRevenueByMonth(
      [{ amount: 500, issue_date: "2026-06-15", status: "Sent" }],
      { start: "2026-06-01", end: "2026-08-31" },
    );

    expect(buckets.map((b) => b.monthKey)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(buckets[0].revenue).toBe(500);
    expect(buckets[1].revenue).toBe(0);
    expect(buckets[2].revenue).toBe(0);
  });

  it("excludes Draft and Void invoices from the chart", () => {
    const buckets = bucketRevenueByMonth(
      [{ amount: 999, issue_date: "2026-06-15", status: "Draft" }],
      { start: "2026-06-01", end: "2026-06-30" },
    );

    expect(buckets[0].revenue).toBe(0);
  });

  it("returns an empty array for an open-ended (all-time) range", () => {
    expect(bucketRevenueByMonth([], { start: null, end: null })).toEqual([]);
  });
});
