import Link from "next/link";
import {
  Wallet,
  ChevronRight,
  HandCoins,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Percent,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFinancesDashboardData } from "./data";
import { FinancesFilterBar } from "@/components/finances/finances-filter-bar";
import { AddExpenseButton } from "@/components/finances/add-expense-button";
import { RevenueTrendChart } from "@/components/finances/revenue-trend-chart";
import { InvoiceRecordStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { clsx } from "clsx";
import type { DateFilterKey } from "@/lib/finances";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

const VALID_FILTERS: DateFilterKey[] = ["this-month", "last-month", "fy", "all-time", "custom"];

type Tone = "positive" | "info" | "caution" | "danger" | "neutral";

// The organizing colour logic for this page is financial sentiment, not a
// record-status rail (that pattern belongs to Jobs, where each row is one
// record with one status) -- each card is coloured by what its number means
// for the business right now.
const TONE_STYLES: Record<Tone, { chip: string; value: string }> = {
  positive: {
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
  },
  info: {
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    value: "text-neutral-900 dark:text-neutral-50",
  },
  caution: {
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-400",
  },
  danger: {
    chip: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    value: "text-red-700 dark:text-red-400",
  },
  neutral: {
    chip: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    value: "text-neutral-900 dark:text-neutral-50",
  },
};

function StatCard({
  label,
  value,
  emphasis,
  hint,
  hintTone,
  href,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  hint?: string;
  hintTone?: Tone;
  href?: string;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  const toneStyle = TONE_STYLES[tone];
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        {Icon ? (
          <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", toneStyle.chip)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p
        className={clsx(
          emphasis ? "mt-1 text-2xl font-bold" : "mt-1 text-xl font-semibold",
          toneStyle.value,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={clsx(
            "mt-1 text-xs",
            hintTone ? TONE_STYLES[hintTone].value : "text-neutral-500",
          )}
        >
          {hint}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900">
      {content}
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

  const supabase = await createClient();
  const [{ summary, recentPayments, highestValueJobs, outstandingInvoices, revenueTrend }, { data: brandSettings }] =
    await Promise.all([
      getFinancesDashboardData(filter, { from, to }),
      supabase.from("business_settings").select("primary_color, accent_color").single(),
    ]);
  const accentColor = brandSettings?.accent_color || "#f59e0b";

  const netGst = summary.gstCollected - summary.gstPaid;

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
        <StatCard
          label="Payments Received"
          value={money(summary.paymentsReceived)}
          emphasis
          tone="positive"
          icon={HandCoins}
        />
        <StatCard
          label="Revenue Invoiced"
          value={money(summary.revenueInvoiced)}
          emphasis
          tone="info"
          icon={FileText}
        />
        <StatCard
          label="Outstanding Invoices"
          value={money(summary.outstandingInvoices)}
          tone={summary.outstandingInvoices > 0 ? "caution" : "neutral"}
          icon={Clock}
        />
        <StatCard
          label="Overdue Invoices"
          value={money(summary.overdueInvoices)}
          tone={summary.overdueInvoices > 0 ? "danger" : "positive"}
          icon={summary.overdueInvoices > 0 ? AlertTriangle : CheckCircle2}
        />
        <StatCard
          label="Business Expenses"
          value={money(summary.businessExpenses)}
          href="/finances/expenses"
          tone="neutral"
          icon={Receipt}
        />
        <StatCard
          label="GST Collected / Paid"
          value={`${money(summary.gstCollected)} / ${money(summary.gstPaid)}`}
          hint={`Net GST position: ${money(netGst)}`}
          hintTone={netGst > 0 ? "caution" : "positive"}
          tone="neutral"
          icon={Percent}
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

      <section>
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
          <p className="rounded-2xl border border-neutral-200 bg-white py-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            Nothing outstanding right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {outstandingInvoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-sm shadow-neutral-900/[0.03] transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
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
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        inv.status === "Overdue"
                          ? "text-red-700 dark:text-red-400"
                          : "text-neutral-900 dark:text-neutral-50",
                      )}
                    >
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

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Revenue Trend
        </h2>
        <RevenueTrendChart months={revenueTrend} accentColor={accentColor} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900">
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
                <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {money(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] dark:border-neutral-800 dark:bg-neutral-900">
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
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Quotes</h3>
              <p className="text-sm text-neutral-500">View all quotes</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>

          <Link
            href="/finances/invoices"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
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
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
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
