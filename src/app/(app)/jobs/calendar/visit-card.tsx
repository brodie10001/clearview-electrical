import Link from "next/link";
import { VisitStatusBadge } from "@/components/ui/status-badge";
import { formatVisitTime, formatDuration } from "@/lib/format";
import type { CalendarVisit, WorkerLookup } from "./page";

export function VisitCard({
  visit,
  workers,
  compact,
}: {
  visit: CalendarVisit;
  workers: WorkerLookup[];
  compact?: boolean;
}) {
  const worker = workers.find((w) => w.id === visit.assigned_worker);
  const workerName = worker ? worker.full_name || worker.email : null;

  return (
    <Link
      href={`/jobs/${visit.jobId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {visit.start_time ? formatVisitTime(visit.start_time) : "No time"} · {visit.property_address}
        </p>
        {!compact ? (
          <p className="truncate text-xs text-neutral-500">
            {[
              visit.customer_name,
              workerName,
              visit.expected_duration_minutes ? formatDuration(visit.expected_duration_minutes) : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No details"}
          </p>
        ) : null}
      </div>
      <VisitStatusBadge status={visit.visit_status} />
    </Link>
  );
}
