// Job billing math, computed live from underlying records every time it's
// needed -- never stored as columns that could drift out of sync.

export interface BillingInvoice {
  amount: number;
  status: string;
  paidAmount: number;
}

export interface JobBilling {
  originalContractValue: number;
  approvedVariations: number;
  revisedContractValue: number;
  invoicedToDate: number;
  paidToDate: number;
  outstanding: number;
  remainingToInvoice: number;
}

// Rounds to the nearest cent and normalizes -0 to 0, so float subtraction
// dust (e.g. 468.5 - 468.50000000001) never surfaces as "-$0.00" in the UI.
function toCents(n: number): number {
  const rounded = Math.round(n * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

export function computeJobBilling({
  acceptedQuoteTotal,
  approvedVariationsSum,
  invoices,
}: {
  acceptedQuoteTotal: number;
  approvedVariationsSum: number;
  invoices: BillingInvoice[];
}): JobBilling {
  const originalContractValue = toCents(acceptedQuoteTotal);
  const approvedVariations = toCents(approvedVariationsSum);
  const revisedContractValue = toCents(originalContractValue + approvedVariations);

  const nonVoidInvoices = invoices.filter((inv) => inv.status !== "Void");
  const invoicedToDate = toCents(nonVoidInvoices.reduce((sum, inv) => sum + inv.amount, 0));
  const paidToDate = toCents(nonVoidInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0));
  const outstanding = toCents(invoicedToDate - paidToDate);
  const remainingToInvoice = toCents(revisedContractValue - invoicedToDate);

  return {
    originalContractValue,
    approvedVariations,
    revisedContractValue,
    invoicedToDate,
    paidToDate,
    outstanding,
    remainingToInvoice,
  };
}
