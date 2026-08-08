import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { InvoiceRecordStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { InvoiceRecordStatus } from "@/types/database";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Sent", value: "Sent" },
  { label: "Partially Paid", value: "Partially Paid" },
  { label: "Paid", value: "Paid" },
  { label: "Overdue", value: "Overdue" },
  { label: "Void", value: "Void" },
  { label: "Written Off", value: "Written Off" },
] as const;

interface InvoiceListRow {
  id: string;
  invoice_number: string;
  stage_label: string | null;
  amount: number;
  due_date: string;
  status: InvoiceRecordStatus;
  jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
}

export default async function FinancesInvoicesPage({
  searchParams,
}: PageProps<"/finances/invoices">) {
  const { status: statusParam } = await searchParams;
  const status = typeof statusParam === "string" ? statusParam : "all";

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, stage_label, amount, due_date, status, jobs(properties(address, customers(name)))",
    )
    .order("due_date", { ascending: false });

  if (status !== "all") query = query.eq("status", status as InvoiceRecordStatus);

  const { data: invoices } = await query.returns<InvoiceListRow[]>();

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/finances"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Finances
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Income — Invoices
      </h1>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/finances/invoices?status=${f.value}`}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              status === f.value
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!invoices || invoices.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No invoices here yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/invoices/${invoice.id}`}
                className="flex items-center gap-3 bg-white px-4 py-3.5 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <Receipt className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {invoice.jobs?.properties?.customers?.name ?? "Unknown customer"}
                    {invoice.stage_label ? ` — ${invoice.stage_label}` : ""}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {invoice.invoice_number} ·{" "}
                    {invoice.jobs?.properties?.address ?? "Unknown property"} · Due{" "}
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    ${invoice.amount.toFixed(2)}
                  </span>
                  <InvoiceRecordStatusBadge status={invoice.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
