import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { QuoteStatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { QuoteStatus } from "@/types/database";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Sent", value: "Sent" },
  { label: "Accepted", value: "Accepted" },
  { label: "Rejected", value: "Rejected" },
] as const;

interface QuoteListRow {
  id: string;
  status: QuoteStatus;
  total: number;
  created_at: string;
  jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
}

export default async function FinancesQuotesPage({ searchParams }: PageProps<"/finances/quotes">) {
  const { status: statusParam } = await searchParams;
  const status = typeof statusParam === "string" ? statusParam : "all";

  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("id, status, total, created_at, jobs(properties(address, customers(name)))")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status as QuoteStatus);

  const { data: quotes } = await query.returns<QuoteListRow[]>();

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href="/finances"
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Finances
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Income — Quotes
      </h1>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/finances/quotes?status=${f.value}`}
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

      {!quotes || quotes.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No quotes here yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link
                href={`/quotes/${quote.id}`}
                className="flex items-center gap-3 bg-white px-4 py-3.5 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {quote.jobs?.properties?.customers?.name ?? "Unknown customer"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {quote.jobs?.properties?.address ?? "Unknown property"} ·{" "}
                    {formatDate(quote.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    ${quote.total.toFixed(2)}
                  </span>
                  <QuoteStatusBadge status={quote.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
