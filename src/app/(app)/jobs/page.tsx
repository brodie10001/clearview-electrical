import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobStatusBadge, InvoiceStatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime } from "@/lib/format";
import { clsx } from "clsx";
import type { JobStatus, InvoiceStatus } from "@/types/database";

const FILTERS = [
  { label: "Open", value: "open" },
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
] as const;

const OPEN_STATUSES: JobStatus[] = [
  "New",
  "Quoting",
  "Awaiting Approval",
  "Scheduled",
  "Travelling",
  "On Site",
  "On Hold",
  "Waiting",
];

interface JobListRow {
  id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
  scheduled_at: string | null;
  properties: { address: string; customers: { name: string } | null } | null;
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const { filter: filterParam } = await searchParams;
  const filter = typeof filterParam === "string" ? filterParam : "open";

  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("id, job_status, invoice_status, scheduled_at, properties(address, customers(name))")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filter === "open") query = query.in("job_status", OPEN_STATUSES);
  if (filter === "completed") query = query.in("job_status", ["Completed", "Closed"]);

  const { data: jobs } = await query.returns<JobListRow[]>();

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Jobs</h1>
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          New Job
        </Link>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/jobs?filter=${f.value}`}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!jobs || jobs.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No jobs here yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-3 bg-white px-4 py-3.5 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {job.properties?.address ?? "Unknown property"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {job.properties?.customers?.name ?? "No customer"}
                    {job.scheduled_at
                      ? ` · ${formatDate(job.scheduled_at)} ${formatTime(job.scheduled_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <JobStatusBadge status={job.job_status} />
                  <InvoiceStatusBadge status={job.invoice_status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
