import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { JobStatusBadge } from "@/components/ui/status-badge";
import { formatVisitTime } from "@/lib/format";
import type { JobStatus } from "@/types/database";

export interface TodayJob {
  visitId: string;
  jobId: string;
  job_status: JobStatus;
  start_time: string | null;
  property_address: string;
  contact_name: string | null;
}

export function TodaysJobsWidget({ jobs }: { jobs: TodayJob[] }) {
  return (
    <WidgetCard
      title="Today's Jobs"
      action={
        <span className="flex items-center gap-1.5 rounded-full bg-[#4F9FE0]/10 px-2.5 py-1 text-xs font-semibold text-[#3D87C7] dark:bg-[#4F9FE0]/15 dark:text-[#4F9FE0]">
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
            <li key={job.visitId}>
              <Link
                href={`/jobs/${job.jobId}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {job.property_address}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {job.start_time ? formatVisitTime(job.start_time) : "No time set"}
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
