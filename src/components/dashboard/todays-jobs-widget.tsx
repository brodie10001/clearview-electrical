import Link from "next/link";
import { Clock, MapPin, User, HardHat } from "lucide-react";
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
  worker_name: string | null;
}

export function TodaysJobsWidget({ jobs }: { jobs: TodayJob[] }) {
  return (
    <WidgetCard
      title="Today's Jobs"
      icon={<Clock className="h-4 w-4 text-neutral-400" />}
      action={
        <span className="rounded-full bg-[#4F9FE0]/10 px-2.5 py-1 text-xs font-semibold text-[#3D87C7] dark:bg-[#4F9FE0]/15 dark:text-[#4F9FE0]">
          {jobs.length} today
        </span>
      }
      footerHref="/jobs/calendar"
      footerLabel="View Schedule"
    >
      {jobs.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Nothing scheduled for today.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.visitId}>
              <Link
                href={`/jobs/${job.jobId}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3.5 transition-colors hover:border-[#4F9FE0]/40 hover:bg-[#4F9FE0]/5 dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-[#4F9FE0]/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                    <Clock className="h-3.5 w-3.5" />
                    {job.start_time ? formatVisitTime(job.start_time) : "No time set"}
                  </span>
                  <JobStatusBadge status={job.job_status} />
                </div>

                <p className="flex items-start gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">{job.property_address}</span>
                </p>

                {job.contact_name ? (
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <User className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">{job.contact_name}</span>
                  </p>
                ) : null}

                {job.worker_name ? (
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <HardHat className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">{job.worker_name}</span>
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
