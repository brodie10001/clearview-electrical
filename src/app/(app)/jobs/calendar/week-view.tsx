import Link from "next/link";
import { clsx } from "clsx";
import { getWeekDays, formatDayLabel } from "@/lib/calendar-dates";
import { VisitCard } from "./visit-card";
import type { CalendarVisit, WorkerLookup } from "./page";

export function WeekView({
  date,
  visits,
  workers,
  today,
}: {
  date: string;
  visits: CalendarVisit[];
  workers: WorkerLookup[];
  today: string;
}) {
  const days = getWeekDays(date);

  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const dayVisits = visits.filter((v) => v.scheduled_date === day);
        const current = day === today;
        return (
          <div
            key={day}
            className={clsx(
              "rounded-2xl border p-4",
              current
                ? "border-[#4F9FE0] bg-[#4F9FE0]/5 dark:border-[#4F9FE0] dark:bg-[#4F9FE0]/10"
                : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
            )}
          >
            <Link
              href={`/jobs/calendar?view=day&date=${day}`}
              className={clsx(
                "mb-2.5 inline-block text-sm font-semibold hover:underline",
                current ? "text-[#3D87C7] dark:text-[#4F9FE0]" : "text-neutral-900 dark:text-neutral-50",
              )}
            >
              {formatDayLabel(day)}
            </Link>
            {dayVisits.length === 0 ? (
              <p className="text-sm text-neutral-500">No visits</p>
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
      })}
    </div>
  );
}
