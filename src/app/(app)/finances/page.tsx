import Link from "next/link";
import { Wallet, FileText, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusBadge } from "@/components/ui/status-badge";
import type { InvoiceStatus } from "@/types/database";

export default async function FinancesPage() {
  const supabase = await createClient();

  const [jobsRes, openQuotesRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, invoice_status, updated_at, properties(address)")
      .neq("invoice_status", "Not Required")
      .order("updated_at", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          invoice_status: InvoiceStatus;
          updated_at: string;
          properties: { address: string } | null;
        }[]
      >(),
    supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["Draft", "Sent"]),
  ]);

  const jobs = jobsRes.data;
  const openQuoteCount = openQuotesRes.count ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Finances</h1>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Income
        </h2>
        <Link
          href="/finances/quotes"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <FileText className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Quotes</h3>
            <p className="text-sm text-neutral-500">
              {openQuoteCount} open {openQuoteCount === 1 ? "quote" : "quotes"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Invoicing
        </h2>
        <p className="mb-3 text-sm text-neutral-500">
          Full invoicing is coming soon. For now, here&apos;s every job with an invoice in
          progress.
        </p>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          {!jobs || jobs.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-500">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between gap-3 bg-white px-4 py-3 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  >
                    <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {job.properties?.address ?? "Unknown property"}
                    </span>
                    <InvoiceStatusBadge status={job.invoice_status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
