"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { updateFeedbackStatus } from "./actions";
import { formatDate, formatTime } from "@/lib/format";
import type { FeedbackRow } from "./page";
import type { FeedbackType, FeedbackStatus } from "@/types/database";

const TYPES: FeedbackType[] = ["Bug Report", "Feature Request", "General Feedback"];
const STATUSES: FeedbackStatus[] = ["New", "Reviewed", "Resolved"];

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  New: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  Reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  Resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function FeedbackList({ items }: { items: FeedbackRow[] }) {
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");

  const filtered = items.filter(
    (item) =>
      (typeFilter === "all" || item.type === typeFilter) &&
      (statusFilter === "all" || item.status === statusFilter),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <FilterGroup
          label="Type"
          value={typeFilter}
          options={TYPES}
          onChange={setTypeFilter}
        />
        <FilterGroup
          label="Status"
          value={statusFilter}
          options={STATUSES}
          onChange={setStatusFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No feedback matches these filters.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "all";
  options: T[];
  onChange: (value: T | "all") => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 p-1 text-xs dark:bg-neutral-800">
      <span className="px-2 text-neutral-500">{label}</span>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={clsx(
          "rounded-full px-2.5 py-1 font-medium transition-colors",
          value === "all"
            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
        )}
      >
        All
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            value === option
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function FeedbackCard({ item }: { item: FeedbackRow }) {
  const [status, setStatus] = useState(item.status);
  const [pending, setPending] = useState(false);

  async function handleStatusChange(next: FeedbackStatus) {
    setPending(true);
    setStatus(next);
    try {
      await updateFeedbackStatus(item.id, next);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {item.type}
            </span>
            <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
              {status}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {item.title}
          </h3>
        </div>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
        {item.description}
      </p>

      {item.screenshot_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a local/static asset
        <img
          src={item.screenshot_url}
          alt="Attached screenshot"
          className="max-h-64 w-fit rounded-lg border border-neutral-200 object-contain dark:border-neutral-800"
        />
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span>{item.business_name}</span>
        <span>{item.submitted_by_name}</span>
        {item.page_path ? <span>{item.page_path}</span> : null}
        <span>
          {formatDate(item.created_at)} {formatTime(item.created_at)}
        </span>
      </div>
    </li>
  );
}
