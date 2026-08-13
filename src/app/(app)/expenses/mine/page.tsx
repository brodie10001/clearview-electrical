import Link from "next/link";
import { ArrowLeft, Receipt as ReceiptIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { formatDate } from "@/lib/format";

interface ExpenseListRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  receipt_url: string | null;
  expense_categories: { name: string } | null;
  jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
}

const SIGNED_URL_TTL_SECONDS = 3600;

export default async function MyExpensesPage() {
  const supabase = await createClient();
  const user = await getRequestUser();

  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "id, date, description, amount, receipt_url, expense_categories(name), jobs(properties(address, customers(name)))",
    )
    .eq("created_by", user!.id)
    .order("created_at", { ascending: false })
    .returns<ExpenseListRow[]>();

  const rows = expenses ?? [];
  const total = rows.reduce((sum, e) => sum + e.amount, 0);

  const withSignedReceipts = await Promise.all(
    rows.map(async (row) => {
      if (!row.receipt_url) return row;
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(row.receipt_url, SIGNED_URL_TTL_SECONDS);
      return { ...row, receipt_url: signed?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/jobs"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Jobs
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">My Expenses</h1>
      <p className="text-sm text-neutral-500">
        {rows.length} expense{rows.length === 1 ? "" : "s"} you&apos;ve logged · ${total.toFixed(2)}{" "}
        total
      </p>

      {withSignedReceipts.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          You haven&apos;t logged any expenses yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {withSignedReceipts.map((expense) => (
            <li
              key={expense.id}
              className="flex items-center gap-3 bg-white px-4 py-3.5 dark:bg-neutral-900"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <ReceiptIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {expense.description}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {expense.expense_categories?.name ?? "Uncategorised"}
                  {" · "}
                  {expense.jobs?.properties?.customers?.name
                    ? `${expense.jobs.properties.customers.name} — ${expense.jobs.properties.address}`
                    : "General/overhead"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  ${expense.amount.toFixed(2)}
                </span>
                <span className="text-xs text-neutral-500">{formatDate(expense.date)}</span>
                {expense.receipt_url ? (
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-amber-600 hover:underline"
                  >
                    Receipt
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
