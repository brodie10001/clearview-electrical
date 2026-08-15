import Link from "next/link";
import { Plus, Briefcase, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isJobOpen } from "@/lib/job-status";
import { isOutstandingInvoiceStatus } from "@/lib/finances";
import { buildAvatarPalette, pickAvatarColor } from "@/lib/avatar-color";
import type { JobStatus, InvoiceStatus, InvoiceRecordStatus } from "@/types/database";

const PAGE_SIZE = 50;

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface PropertyRow {
  id: string;
  customer_id: string;
}

interface JobRow {
  id: string;
  property_id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
}

interface InvoiceRow {
  job_id: string;
  amount: number;
  status: InvoiceRecordStatus;
  payments: { amount: number }[];
}

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  // Fetch one extra row to know whether a next page exists without a
  // separate count query.
  const [{ data }, { data: brandSettings }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone")
      .order("name")
      .range(from, from + PAGE_SIZE)
      .returns<CustomerRow[]>(),
    supabase.from("business_settings").select("primary_color, accent_color").single(),
  ]);

  const rows = data ?? [];
  const hasNext = rows.length > PAGE_SIZE;
  const customers = rows.slice(0, PAGE_SIZE);
  const avatarPalette = buildAvatarPalette(
    brandSettings?.primary_color || "#f59e0b",
    brandSettings?.accent_color || "#3b82f6",
  );

  // Active-job counts and outstanding balances are both derived from data
  // this page has no dedicated tracking for -- properties -> jobs ->
  // invoices/payments, the same relations the Jobs list and dashboard KPIs
  // already read. Batched by id across the whole page of customers (same
  // pattern the Jobs list uses for next-visit lookups) rather than one
  // query per customer row.
  const customerIds = customers.map((c) => c.id);

  const { data: propertiesData } =
    customerIds.length > 0
      ? await supabase.from("properties").select("id, customer_id").in("customer_id", customerIds).returns<
          PropertyRow[]
        >()
      : { data: [] as PropertyRow[] };
  const customerIdByPropertyId = new Map((propertiesData ?? []).map((p) => [p.id, p.customer_id]));
  const propertyIds = (propertiesData ?? []).map((p) => p.id);

  const { data: jobsData } =
    propertyIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, property_id, job_status, invoice_status")
          .eq("archived", false)
          .in("property_id", propertyIds)
          .returns<JobRow[]>()
      : { data: [] as JobRow[] };
  const jobIds = (jobsData ?? []).map((j) => j.id);
  const customerIdByJobId = new Map(
    (jobsData ?? []).map((j) => [j.id, customerIdByPropertyId.get(j.property_id)]),
  );

  // RLS already restricts invoices to owners/admins -- a technician's
  // request just comes back empty here, so their cards simply show no
  // balance badge rather than needing a role check in this page.
  const { data: invoicesData } =
    jobIds.length > 0
      ? await supabase
          .from("invoices")
          .select("job_id, amount, status, payments(amount)")
          .in("job_id", jobIds)
          .returns<InvoiceRow[]>()
      : { data: [] as InvoiceRow[] };

  const activeJobCountByCustomer = new Map<string, number>();
  for (const job of jobsData ?? []) {
    if (!isJobOpen(job.job_status, job.invoice_status)) continue;
    const customerId = customerIdByPropertyId.get(job.property_id);
    if (!customerId) continue;
    activeJobCountByCustomer.set(customerId, (activeJobCountByCustomer.get(customerId) ?? 0) + 1);
  }

  const outstandingByCustomer = new Map<string, number>();
  for (const invoice of invoicesData ?? []) {
    if (!isOutstandingInvoiceStatus(invoice.status)) continue;
    const customerId = customerIdByJobId.get(invoice.job_id);
    if (!customerId) continue;
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const owed = Math.max(0, invoice.amount - paid);
    outstandingByCustomer.set(customerId, (outstandingByCustomer.get(customerId) ?? 0) + owed);
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Customers</h1>
        <Link
          href="/customers/new"
          className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          New Customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          {page > 1 ? "No more customers." : "No customers yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => {
            const activeJobs = activeJobCountByCustomer.get(customer.id) ?? 0;
            const outstanding = outstandingByCustomer.get(customer.id) ?? 0;
            return (
              <li key={customer.id}>
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex h-full items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-900/[0.03] transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: pickAvatarColor(customer.id, avatarPalette) }}
                  >
                    {customer.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {customer.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {customer.phone || customer.email || "No contact info"}
                    </p>
                  </div>
                  {activeJobs > 0 || outstanding > 0 ? (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {activeJobs > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          <Briefcase className="h-3 w-3" />
                          {activeJobs} active
                        </span>
                      ) : null}
                      {outstanding > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          <Wallet className="h-3 w-3" />${outstanding.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {page > 1 || hasNext ? (
        <div className="flex items-center justify-between">
          <Link
            href={`/customers?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium ${
              page <= 1
                ? "pointer-events-none text-neutral-300 dark:text-neutral-700"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
          <Link
            href={`/customers?page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium ${
              !hasNext
                ? "pointer-events-none text-neutral-300 dark:text-neutral-700"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
