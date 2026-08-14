import { describe, it, expect } from "vitest";
import { computeJobBilling } from "./billing";

describe("computeJobBilling", () => {
  it("computes a simple fully-invoiced, fully-paid job", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 1000,
      approvedVariationsSum: 0,
      invoices: [{ amount: 1000, status: "Paid", paidAmount: 1000 }],
    });

    expect(billing.originalContractValue).toBe(1000);
    expect(billing.revisedContractValue).toBe(1000);
    expect(billing.invoicedToDate).toBe(1000);
    expect(billing.paidToDate).toBe(1000);
    expect(billing.outstanding).toBe(0);
    expect(billing.remainingToInvoice).toBe(0);
  });

  it("adds approved variations onto the original contract value", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 1000,
      approvedVariationsSum: 250,
      invoices: [],
    });

    expect(billing.revisedContractValue).toBe(1250);
    expect(billing.remainingToInvoice).toBe(1250);
  });

  it("excludes Void invoices from every totals", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 1000,
      approvedVariationsSum: 0,
      invoices: [
        { amount: 500, status: "Paid", paidAmount: 500 },
        { amount: 500, status: "Void", paidAmount: 0 },
      ],
    });

    expect(billing.invoicedToDate).toBe(500);
    expect(billing.remainingToInvoice).toBe(500);
  });

  it("tracks partial payment as outstanding, not paid", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 1000,
      approvedVariationsSum: 0,
      invoices: [{ amount: 1000, status: "Partially Paid", paidAmount: 400 }],
    });

    expect(billing.paidToDate).toBe(400);
    expect(billing.outstanding).toBe(600);
  });

  it("sums multiple progress invoices against one contract", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 3000,
      approvedVariationsSum: 0,
      invoices: [
        { amount: 1000, status: "Paid", paidAmount: 1000 },
        { amount: 1000, status: "Paid", paidAmount: 1000 },
        { amount: 500, status: "Sent", paidAmount: 0 },
      ],
    });

    expect(billing.invoicedToDate).toBe(2500);
    expect(billing.paidToDate).toBe(2000);
    expect(billing.outstanding).toBe(500);
    expect(billing.remainingToInvoice).toBe(500);
  });

  it("never returns -0 for an exactly-settled job", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 468.5,
      approvedVariationsSum: 0,
      invoices: [{ amount: 468.5, status: "Paid", paidAmount: 468.5 }],
    });

    // Object.is distinguishes 0 from -0; toBe alone would let -0 slip through.
    expect(Object.is(billing.outstanding, 0)).toBe(true);
    expect(Object.is(billing.remainingToInvoice, 0)).toBe(true);
  });

  it("rounds cent-level floating point drift instead of leaking it", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 0.1,
      approvedVariationsSum: 0.2,
      invoices: [],
    });

    // 0.1 + 0.2 === 0.30000000000000004 in raw JS float math.
    expect(billing.revisedContractValue).toBe(0.3);
  });

  it("allows negative remainingToInvoice when a job is over-invoiced", () => {
    const billing = computeJobBilling({
      acceptedQuoteTotal: 1000,
      approvedVariationsSum: 0,
      invoices: [{ amount: 1200, status: "Sent", paidAmount: 0 }],
    });

    expect(billing.remainingToInvoice).toBe(-200);
  });
});
