import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { formatVisitDate, formatVisitTime } from "@/lib/format";

export interface UpcomingVisit {
  id: string;
  jobId: string;
  scheduledDate: string;
  startTime: string | null;
  propertyAddress: string;
}

export function CalendarOverviewWidget({ visits }: { visits: UpcomingVisit[] }) {
  return (
    <WidgetCard
      title="Upcoming"
      icon={<CalendarRange className="h-4 w-4 text-neutral-400" />}
      footerHref="/jobs/calendar"
      footerLabel="View Calendar"
    >
      {visits.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Nothing scheduled in the next few days.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {visits.map((visit) => (
            <li key={visit.id}>
              <Link
                href={`/jobs/${visit.jobId}`}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-neutral-50 py-1.5 text-center dark:bg-neutral-800">
                  <span className="text-[10px] font-semibold uppercase text-neutral-400">
                    {formatVisitDate(visit.scheduledDate).split(" ")[0]}
                  </span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                    {formatVisitDate(visit.scheduledDate).split(" ")[1]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {visit.propertyAddress}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {visit.startTime ? formatVisitTime(visit.startTime) : "No time set"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
