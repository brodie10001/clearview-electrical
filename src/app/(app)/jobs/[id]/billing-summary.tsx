import type { JobBilling } from "@/lib/billing";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function BillingSummary({ billing }: { billing: JobBilling }) {
  const rows: { label: string; value: number; emphasis?: boolean }[] = [
    { label: "Original contract value", value: billing.originalContractValue },
    { label: "Approved variations", value: billing.approvedVariations },
    { label: "Revised contract value", value: billing.revisedContractValue, emphasis: true },
    { label: "Invoiced to date", value: billing.invoicedToDate },
    { label: "Paid to date", value: billing.paidToDate },
    { label: "Outstanding", value: billing.outstanding },
    { label: "Remaining to invoice", value: billing.remainingToInvoice, emphasis: true },
  ];

  return (
    <dl className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-sm">
          <dt className={row.emphasis ? "font-medium text-neutral-700 dark:text-neutral-300" : "text-neutral-500"}>
            {row.label}
          </dt>
          <dd
            className={
              row.emphasis
                ? "font-semibold text-neutral-900 dark:text-neutral-50"
                : "text-neutral-900 dark:text-neutral-50"
            }
          >
            {money(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
