import Link from "next/link";
import { List, CalendarDays } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/format";
import {
  addDays,
  getWeekDays,
  getMonthGridDays,
  formatMonthYearLabel,
  formatWeekRangeLabel,
  formatDayLabel,
} from "@/lib/calendar-dates";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { AgendaView } from "./agenda-view";
import type { JobStatus, VisitStatus } from "@/types/database";

export interface CalendarVisit {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  expected_duration_minutes: number | null;
  visit_status: VisitStatus;
  assigned_worker: string | null;
  jobId: string;
  job_status: JobStatus;
  property_address: string;
  customer_name: string | null;
}

export interface WorkerLookup {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface RawVisitRow {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  expected_duration_minutes: number | null;
  visit_status: VisitStatus;
  assigned_worker: string | null;
  jobs: {
    id: string;
    job_status: JobStatus;
    properties: { address: string; customers: { name: string } | null } | null;
  } | null;
}

const VIEWS = [
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "month", label: "Month" },
  { key: "agenda", label: "Agenda" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

function shiftDate(view: ViewKey, date: string, direction: 1 | -1): string {
  if (view === "day") return addDays(date, direction);
  if (view === "week") return addDays(date, direction * 7);
  if (view === "agenda") return addDays(date, direction * 14);
  // month: jump to the 1st of the prev/next month
  const [y, m] = date.split("-").map(Number);
  const newMonthIndex = m - 1 + direction;
  const newYear = y + Math.floor(newMonthIndex / 12);
  const newMonth = ((newMonthIndex % 12) + 12) % 12;
  return `${newYear}-${String(newMonth + 1).padStart(2, "0")}-01`;
}

export default async function CalendarPage({ searchParams }: PageProps<"/jobs/calendar">) {
  const { view: viewParam, date: dateParam } = await searchParams;
  const view: ViewKey = VIEWS.some((v) => v.key === viewParam) ? (viewParam as ViewKey) : "week";
  const today = todayDateString();
  const date = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  let rangeStart: string;
  let rangeEnd: string;
  if (view === "day") {
    rangeStart = date;
    rangeEnd = date;
  } else if (view === "week") {
    const days = getWeekDays(date);
    rangeStart = days[0];
    rangeEnd = days[6];
  } else if (view === "month") {
    const grid = getMonthGridDays(date);
    rangeStart = grid[0];
    rangeEnd = grid[grid.length - 1];
  } else {
    rangeStart = date;
    rangeEnd = addDays(date, 30);
  }

  const supabase = await createClient();
  const [visitsRes, workersRes] = await Promise.all([
    supabase
      .from("job_visits")
      .select(
        "id, scheduled_date, start_time, expected_duration_minutes, visit_status, assigned_worker, jobs(id, job_status, properties(address, customers(name)))",
      )
      .gte("scheduled_date", rangeStart)
      .lte("scheduled_date", rangeEnd)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .returns<RawVisitRow[]>(),
    supabase.from("profiles").select("id, full_name, email").eq("active", true).returns<WorkerLookup[]>(),
  ]);

  const visits: CalendarVisit[] = (visitsRes.data ?? [])
    .filter((v) => v.jobs)
    .map((v) => ({
      id: v.id,
      scheduled_date: v.scheduled_date,
      start_time: v.start_time,
      expected_duration_minutes: v.expected_duration_minutes,
      visit_status: v.visit_status,
      assigned_worker: v.assigned_worker,
      jobId: v.jobs!.id,
      job_status: v.jobs!.job_status,
      property_address: v.jobs!.properties?.address ?? "Unknown property",
      customer_name: v.jobs!.properties?.customers?.name ?? null,
    }));

  const workers = workersRes.data ?? [];

  const rangeLabel =
    view === "day"
      ? formatDayLabel(date, "long")
      : view === "week"
        ? formatWeekRangeLabel(date)
        : view === "month"
          ? formatMonthYearLabel(date)
          : `Next 30 days from ${formatDayLabel(date)}`;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Calendar</h1>
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <List className="h-4 w-4" />
          List
        </Link>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/jobs/calendar?view=${v.key}&date=${date}`}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              view === v.key
                ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/jobs/calendar?view=${view}&date=${shiftDate(view, date, -1)}`}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Previous"
          >
            ←
          </Link>
          <Link
            href={`/jobs/calendar?view=${view}&date=${today}`}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Today
          </Link>
          <Link
            href={`/jobs/calendar?view=${view}&date=${shiftDate(view, date, 1)}`}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Next"
          >
            →
          </Link>
        </div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <CalendarDays className="h-4 w-4 text-neutral-400" />
          {rangeLabel}
        </p>
      </div>

      {view === "day" ? <DayView date={date} visits={visits} workers={workers} /> : null}
      {view === "week" ? <WeekView date={date} visits={visits} workers={workers} today={today} /> : null}
      {view === "month" ? <MonthView date={date} visits={visits} today={today} /> : null}
      {view === "agenda" ? (
        <AgendaView rangeStart={rangeStart} rangeEnd={rangeEnd} visits={visits} workers={workers} />
      ) : null}
    </div>
  );
}
