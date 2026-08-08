import Link from "next/link";
import { Wallet, FileText, Receipt, Banknote, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function FinancesPage() {
  const supabase = await createClient();

  const [openQuotesRes, openInvoicesRes, paymentsCountRes] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["Draft", "Sent"]),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["Draft", "Sent", "Partially Paid", "Overdue"]),
    supabase.from("payments").select("id", { count: "exact", head: true }),
  ]);

  const openQuoteCount = openQuotesRes.count ?? 0;
  const openInvoiceCount = openInvoicesRes.count ?? 0;
  const paymentsCount = paymentsCountRes.count ?? 0;

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
        <div className="flex flex-col gap-2">
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

          <Link
            href="/finances/invoices"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Receipt className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Invoices</h3>
              <p className="text-sm text-neutral-500">
                {openInvoiceCount} open {openInvoiceCount === 1 ? "invoice" : "invoices"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>

          <Link
            href="/finances/payments"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Banknote className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Payments</h3>
              <p className="text-sm text-neutral-500">
                {paymentsCount} {paymentsCount === 1 ? "payment" : "payments"} recorded
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>
        </div>
      </section>
    </div>
  );
}
