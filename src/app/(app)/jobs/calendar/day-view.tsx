import { VisitCard } from "./visit-card";
import type { CalendarVisit, WorkerLookup } from "./page";

export function DayView({
  date,
  visits,
  workers,
}: {
  date: string;
  visits: CalendarVisit[];
  workers: WorkerLookup[];
}) {
  const dayVisits = visits.filter((v) => v.scheduled_date === date);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {dayVisits.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">No visits scheduled for this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {dayVisits.map((visit) => (
            <li key={visit.id}>
              <VisitCard visit={visit} workers={workers} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
