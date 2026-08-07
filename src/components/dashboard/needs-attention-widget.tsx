import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { JobStatusBadge } from "@/components/ui/status-badge";
import { formatRelative } from "@/lib/format";
import type { JobStatus } from "@/types/database";

export interface StalledJob {
  id: string;
  job_status: JobStatus;
  updated_at: string;
  property_address: string;
}

export function NeedsAttentionWidget({ jobs }: { jobs: StalledJob[] }) {
  return (
    <WidgetCard title="Needs Attention">
      {jobs.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Nothing stalled — nice work.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {job.property_address}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      No update in {formatRelative(job.updated_at)}
                    </p>
                  </div>
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
