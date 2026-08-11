import Link from "next/link";
import { Wallet, ChevronRight } from "lucide-react";
import { getFinancesDashboardData } from "./data";
import { FinancesFilterBar } from "@/components/finances/finances-filter-bar";
import { AddExpenseButton } from "@/components/finances/add-expense-button";
import { RevenueTrendChart } from "@/components/finances/revenue-trend-chart";
import { InvoiceRecordStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { DateFilterKey } from "@/lib/finances";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

const VALID_FILTERS: DateFilterKey[] = ["this-month", "last-month", "fy", "all-time", "custom"];

function StatCard({
  label,
  value,
  emphasis,
  hint,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={
          emphasis
            ? "mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50"
            : "mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50"
        }
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default async function FinancesPage({ searchParams }: PageProps<"/finances">) {
  const params = await searchParams;
  const filterParam = typeof params.filter === "string" ? params.filter : "this-month";
  const filter: DateFilterKey = VALID_FILTERS.includes(filterParam as DateFilterKey)
    ? (filterParam as DateFilterKey)
    : "this-month";
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;

  const { summary, recentPayments, highestValueJobs, outstandingInvoices, revenueTrend } =
    await getFinancesDashboardData(filter, { from, to });

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Finances</h1>
        </div>
        <AddExpenseButton />
      </div>

      <FinancesFilterBar filter={filter} from={from} to={to} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Payments Received" value={money(summary.paymentsReceived)} emphasis />
        <StatCard label="Revenue Invoiced" value={money(summary.revenueInvoiced)} emphasis />
        <StatCard label="Outstanding Invoices" value={money(summary.outstandingInvoices)} />
        <StatCard label="Overdue Invoices" value={money(summary.overdueInvoices)} />
        <StatCard label="Business Expenses" value={money(summary.businessExpenses)} />
        <StatCard
          label="GST Collected / Paid"
          value={`${money(summary.gstCollected)} / ${money(summary.gstPaid)}`}
          hint={`Net GST position: ${money(summary.gstCollected - summary.gstPaid)}`}
        />
      </section>

      {summary.grossProfit !== null || summary.netOperatingResult !== null ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summary.grossProfit !== null ? (
            <StatCard
              label="Estimated Gross Profit"
              value={money(summary.grossProfit)}
              hint="Revenue less direct job costs (materials, labour, job-linked expenses) for jobs invoiced this period."
              emphasis
            />
          ) : null}
          {summary.netOperatingResult !== null ? (
            <StatCard
              label="Estimated Net Operating Result"
              value={money(summary.netOperatingResult)}
              hint="Internal management estimate only — not a Net Profit figure for accounting or tax purposes."
              emphasis
            />
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Outstanding Invoices
          </h2>
          <Link
            href="/finances/invoices"
            className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            View all invoices
          </Link>
        </div>
        {outstandingInvoices.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">
            Nothing outstanding right now.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {outstandingInvoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {inv.customerName ?? "Unknown customer"}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {inv.invoiceNumber} · {inv.propertyAddress} · Due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {money(inv.amountOutstanding)}
                    </span>
                    <InvoiceRecordStatusBadge status={inv.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Revenue Trend
        </h2>
        <RevenueTrendChart months={revenueTrend} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Recent Payments
        </h2>
        {recentPayments.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">No payments in this period.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {p.customer_name ?? "Unknown customer"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {p.invoice_number} · {p.property_address} · {formatDate(p.paid_date)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {money(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Highest-Value Jobs
        </h2>
        {highestValueJobs.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">No invoiced jobs in this period.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {highestValueJobs.map((job) => (
              <li key={job.jobId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {job.customerName ?? "Unknown customer"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">{job.propertyAddress}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {money(job.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Income
        </h2>
        <div className="flex flex-col gap-2">
          <Link
            href="/finances/quotes"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Quotes</h3>
              <p className="text-sm text-neutral-500">View all quotes</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>

          <Link
            href="/finances/invoices"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Invoices
              </h3>
              <p className="text-sm text-neutral-500">View all invoices</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>

          <Link
            href="/finances/payments"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Payments
              </h3>
              <p className="text-sm text-neutral-500">View all payments</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>
        </div>
      </section>
    </div>
  );
}
