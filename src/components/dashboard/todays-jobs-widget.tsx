import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { JobStatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/format";
import type { JobStatus } from "@/types/database";

export interface TodayJob {
  id: string;
  job_status: JobStatus;
  scheduled_at: string | null;
  property_address: string;
  contact_name: string | null;
}

export function TodaysJobsWidget({ jobs }: { jobs: TodayJob[] }) {
  return (
    <WidgetCard
      title="Today's Jobs"
      action={
        <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <CalendarCheck className="h-3.5 w-3.5" />
          {jobs.length}
        </span>
      }
    >
      {jobs.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Nothing scheduled for today.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {job.property_address}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {job.scheduled_at ? formatTime(job.scheduled_at) : "No time set"}
                    {job.contact_name ? ` · ${job.contact_name}` : ""}
                  </p>
                </div>
                <JobStatusBadge status={job.job_status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
