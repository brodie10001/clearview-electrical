import { formatDayLabel } from "@/lib/calendar-dates";
import { VisitCard } from "./visit-card";
import type { CalendarVisit, WorkerLookup } from "./page";

export function AgendaView({
  rangeStart,
  rangeEnd,
  visits,
  workers,
}: {
  rangeStart: string;
  rangeEnd: string;
  visits: CalendarVisit[];
  workers: WorkerLookup[];
}) {
  const days = Array.from(new Set(visits.map((v) => v.scheduled_date))).sort();

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">
          No visits scheduled between {formatDayLabel(rangeStart)} and {formatDayLabel(rangeEnd)}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <div key={day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {formatDayLabel(day)}
          </h3>
          <ul className="flex flex-col gap-2">
            {visits
              .filter((v) => v.scheduled_date === day)
              .map((visit) => (
                <li key={visit.id}>
                  <VisitCard visit={visit} workers={workers} compact />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
