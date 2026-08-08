import Link from "next/link";
import { clsx } from "clsx";
import { getMonthGridDays, isSameMonth, dayOfMonth } from "@/lib/calendar-dates";
import { formatVisitTime } from "@/lib/format";
import type { CalendarVisit } from "./page";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE = 2;

export function MonthView({
  date,
  visits,
  today,
}: {
  date: string;
  visits: CalendarVisit[];
  today: string;
}) {
  const gridDays = getMonthGridDays(date);
  const visitsByDay = new Map<string, CalendarVisit[]>();
  for (const visit of visits) {
    const list = visitsByDay.get(visit.scheduled_date) ?? [];
    list.push(visit);
    visitsByDay.set(visit.scheduled_date, list);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
        {WEEKDAY_HEADERS.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-500"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDays.map((day) => {
          const dayVisits = visitsByDay.get(day) ?? [];
          const inMonth = isSameMonth(day, date);
          const current = day === today;
          return (
            <Link
              key={day}
              href={`/jobs/calendar?view=day&date=${day}`}
              className={clsx(
                "flex min-h-[72px] flex-col gap-0.5 border-b border-r border-neutral-100 p-1.5 last:border-r-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50",
                !inMonth && "bg-neutral-50/50 dark:bg-neutral-900/50",
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium",
                  current
                    ? "bg-[#4F9FE0] text-white"
                    : inMonth
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-neutral-400 dark:text-neutral-600",
                )}
              >
                {dayOfMonth(day)}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayVisits.slice(0, MAX_VISIBLE).map((v) => (
                  <span
                    key={v.id}
                    className="truncate rounded bg-[#4F9FE0]/10 px-1 py-0.5 text-[9px] font-medium text-[#3D87C7] dark:bg-[#4F9FE0]/15 dark:text-[#4F9FE0]"
                  >
                    {v.start_time ? formatVisitTime(v.start_time) : ""} {v.property_address}
                  </span>
                ))}
                {dayVisits.length > MAX_VISIBLE ? (
                  <span className="text-[9px] font-medium text-neutral-400">
                    +{dayVisits.length - MAX_VISIBLE} more
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
