"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, CalendarClock } from "lucide-react";
import { createVisit, updateVisit, updateVisitStatus, deleteVisit } from "../actions";
import { formatVisitDate, formatVisitTime, formatDuration } from "@/lib/format";
import type { VisitStatus } from "@/types/database";

const VISIT_STATUSES: VisitStatus[] = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rescheduled",
];

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export interface VisitData {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  expected_duration_minutes: number | null;
  assigned_worker: string | null;
  notes: string | null;
  visit_status: VisitStatus;
}

export interface WorkerOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

function workerLabel(worker: WorkerOption) {
  return worker.full_name || worker.email || "Unnamed";
}

export function VisitsSection({
  jobId,
  visits,
  workers,
}: {
  jobId: string;
  visits: VisitData[];
  workers: WorkerOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const workerName = (id: string | null) => {
    if (!id) return null;
    const worker = workers.find((w) => w.id === id);
    return worker ? workerLabel(worker) : null;
  };

  return (
    <div className="flex flex-col gap-3">
      {visits.length === 0 ? (
        <p className="text-sm text-neutral-500">No visits scheduled yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {visits.map((visit) =>
            editingId === visit.id ? (
              <VisitEditRow
                key={visit.id}
                visit={visit}
                jobId={jobId}
                workers={workers}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <li key={visit.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                <div className="flex min-w-0 items-start gap-2.5">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {formatVisitDate(visit.scheduled_date)}
                      {visit.start_time ? ` · ${formatVisitTime(visit.start_time)}` : ""}
                      {visit.expected_duration_minutes
                        ? ` (${formatDuration(visit.expected_duration_minutes)})`
                        : ""}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {[workerName(visit.assigned_worker), visit.notes].filter(Boolean).join(" · ") ||
                        "No details"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={visit.visit_status}
                    onChange={(e) =>
                      startTransition(() =>
                        updateVisitStatus(visit.id, jobId, e.target.value as VisitStatus),
                      )
                    }
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {VISIT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setEditingId(visit.id)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label="Edit visit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => startTransition(() => deleteVisit(visit.id, jobId))}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                    aria-label="Delete visit"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {adding ? (
        <form
          action={async (formData) => {
            await createVisit(jobId, formData);
            setAdding(false);
          }}
          className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        >
          <VisitFields workers={workers} />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Add visit
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" /> Schedule a visit
        </button>
      )}
    </div>
  );
}

function VisitFields({
  workers,
  defaults,
}: {
  workers: WorkerOption[];
  defaults?: VisitData;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <label className="text-xs font-medium text-neutral-500">Date</label>
        <input
          name="scheduled_date"
          type="date"
          required
          defaultValue={defaults?.scheduled_date}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Start time</label>
        <input
          name="start_time"
          type="time"
          defaultValue={defaults?.start_time ?? ""}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Duration (min)</label>
        <input
          name="expected_duration_minutes"
          type="number"
          min="1"
          step="1"
          defaultValue={defaults?.expected_duration_minutes ?? ""}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Worker</label>
        <select
          name="assigned_worker"
          defaultValue={defaults?.assigned_worker ?? ""}
          className={inputClass}
        >
          <option value="">Unassigned</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {workerLabel(w)}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-4">
        <label className="text-xs font-medium text-neutral-500">Notes (optional)</label>
        <input name="notes" defaultValue={defaults?.notes ?? ""} className={inputClass} />
      </div>
    </div>
  );
}

function VisitEditRow({
  visit,
  jobId,
  workers,
  onDone,
}: {
  visit: VisitData;
  jobId: string;
  workers: WorkerOption[];
  onDone: () => void;
}) {
  return (
    <li className="py-3 first:pt-0">
      <form
        action={async (formData) => {
          await updateVisit(visit.id, jobId, formData);
          onDone();
        }}
        className="flex flex-col gap-2"
      >
        <VisitFields workers={workers} defaults={visit} />
        <div className="flex gap-1">
          <button
            type="submit"
            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </li>
  );
}
