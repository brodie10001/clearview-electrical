import Link from "next/link";
import { ArrowLeft, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

interface PaymentListRow {
  id: string;
  amount: number;
  paid_date: string;
  method: string | null;
  notes: string | null;
  invoices: {
    id: string;
    invoice_number: string;
    jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
  } | null;
}

export default async function FinancesPaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, paid_date, method, notes, invoices(id, invoice_number, jobs(properties(address, customers(name))))",
    )
    .order("paid_date", { ascending: false })
    .returns<PaymentListRow[]>();

  const totalReceived = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/finances"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Finances
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Income — Payments
      </h1>
      <p className="text-sm text-neutral-500">
        {payments?.length ?? 0} payment{(payments?.length ?? 0) === 1 ? "" : "s"} recorded · $
        {totalReceived.toFixed(2)} total received
      </p>

      {!payments || payments.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No payments recorded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {payments.map((payment) => (
            <li key={payment.id}>
              <Link
                href={payment.invoices ? `/invoices/${payment.invoices.id}` : "#"}
                className="flex items-center gap-3 bg-white px-4 py-3.5 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {payment.invoices?.jobs?.properties?.customers?.name ?? "Unknown customer"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {payment.invoices?.invoice_number ?? "—"} ·{" "}
                    {payment.invoices?.jobs?.properties?.address ?? "Unknown property"}
                    {payment.method ? ` · ${payment.method}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    ${payment.amount.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-500">{formatDate(payment.paid_date)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
