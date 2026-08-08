import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobStatusBadge, InvoiceStatusBadge } from "@/components/ui/status-badge";
import { formatVisitDate, formatVisitTime, todayDateString } from "@/lib/format";
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
  "Ready to Schedule",
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
  created_at: string;
  properties: { address: string; customers: { name: string } | null } | null;
}

interface VisitLookupRow {
  job_id: string;
  scheduled_date: string;
  start_time: string | null;
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const { filter: filterParam } = await searchParams;
  const filter = typeof filterParam === "string" ? filterParam : "open";

  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("id, job_status, invoice_status, created_at, properties(address, customers(name))")
    .order("created_at", { ascending: false });

  if (filter === "open") query = query.in("job_status", OPEN_STATUSES);
  if (filter === "completed") query = query.in("job_status", ["Completed", "Closed"]);

  const { data: jobsData } = await query.returns<JobListRow[]>();
  const jobs = jobsData ?? [];

  const jobIds = jobs.map((j) => j.id);
  const { data: visitsData } =
    jobIds.length > 0
      ? await supabase
          .from("job_visits")
          .select("job_id, scheduled_date, start_time")
          .in("job_id", jobIds)
          .order("scheduled_date", { ascending: true })
          .order("start_time", { ascending: true, nullsFirst: false })
          .returns<VisitLookupRow[]>()
      : { data: [] as VisitLookupRow[] };

  const today = todayDateString();
  const nextVisitByJob = new Map<string, VisitLookupRow>();
  for (const visit of visitsData ?? []) {
    if (visit.scheduled_date < today) continue;
    if (!nextVisitByJob.has(visit.job_id)) nextVisitByJob.set(visit.job_id, visit);
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    const va = nextVisitByJob.get(a.id);
    const vb = nextVisitByJob.get(b.id);
    if (va && vb) {
      const cmp = va.scheduled_date.localeCompare(vb.scheduled_date);
      if (cmp !== 0) return cmp;
      return (va.start_time ?? "").localeCompare(vb.start_time ?? "");
    }
    if (va) return -1;
    if (vb) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Jobs</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/jobs/calendar"
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Link>
          <Link
            href="/jobs/new"
            className="flex items-center gap-1.5 rounded-full bg-[#4F9FE0] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#4387BE]"
          >
            <Plus className="h-4 w-4" />
            New Job
          </Link>
        </div>
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

      {sortedJobs.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No jobs here yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {sortedJobs.map((job) => {
            const nextVisit = nextVisitByJob.get(job.id);
            return (
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
                      {nextVisit
                        ? ` · ${formatVisitDate(nextVisit.scheduled_date)}${
                            nextVisit.start_time ? ` ${formatVisitTime(nextVisit.start_time)}` : ""
                          }`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <JobStatusBadge status={job.job_status} />
                    <InvoiceStatusBadge status={job.invoice_status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
