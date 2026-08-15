"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { clsx } from "clsx";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { JobStatusBadge, InvoiceStatusBadge } from "@/components/ui/status-badge";
import { formatVisitDate, formatVisitTime } from "@/lib/format";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_COLORS } from "@/lib/property-type";
import { deleteJob, archiveJob } from "./actions";
import type { JobStatus, InvoiceStatus, PropertyType } from "@/types/database";

export interface JobListRow {
  id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
  address: string;
  propertyType: PropertyType;
  customerName: string | null;
  nextVisit: { scheduled_date: string; start_time: string | null } | null;
}

export interface BrandColors {
  primary: string;
  accent: string;
}

// The status rail is this page's own "at a glance" colour language, built
// around the business's actual configured brand colours for the two most
// central states (Scheduled = primary, Quoting = accent) rather than a
// generic Tailwind palette -- everything else reuses hues already
// established by JobStatusBadge (status-badge.tsx) so this doesn't
// introduce a second, unrelated colour system for the same statuses.
function railColor(status: JobStatus, brand: BrandColors): string {
  switch (status) {
    case "New":
      return "#a3a3a3"; // neutral-400
    case "Quoting":
      return brand.accent;
    case "Awaiting Approval":
      return "#f97316"; // orange-500
    case "Ready to Schedule":
      return "#8b5cf6"; // violet-500
    case "Scheduled":
      return brand.primary;
    case "On Site":
      return "#10b981"; // emerald-500
    case "Completed":
      return "#22c55e"; // green-500
    case "Closed":
      return "#a3a3a3"; // neutral-400
  }
}

type DeleteStage =
  | { name: "confirm"; job: JobListRow }
  | { name: "blocked"; job: JobListRow; reason: string }
  | { name: "working"; job: JobListRow };

export function JobsList({
  jobs: initialJobs,
  brandColors,
}: {
  jobs: JobListRow[];
  brandColors: BrandColors;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  // The list is server-fetched and only changes page-to-page via navigation
  // (filter links) -- keep local state in sync with that, without an effect
  // (React's documented pattern for "adjust state when a prop changes").
  const [syncedFrom, setSyncedFrom] = useState(initialJobs);
  if (initialJobs !== syncedFrom) {
    setSyncedFrom(initialJobs);
    setJobs(initialJobs);
  }
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [stage, setStage] = useState<DeleteStage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function removeJob(jobId: string) {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  async function handleDelete(job: JobListRow) {
    setStage({ name: "working", job });
    const result = await deleteJob(job.id);
    if (result.deleted) {
      removeJob(job.id);
      setStage(null);
      setOpenRowId(null);
      setToastMessage("Job deleted");
    } else if (result.blockedReason) {
      setStage({ name: "blocked", job, reason: result.blockedReason });
    } else {
      // Not found -- already gone (e.g. deleted elsewhere). Just reflect that.
      removeJob(job.id);
      setStage(null);
      setOpenRowId(null);
    }
  }

  async function handleArchive(job: JobListRow) {
    setStage({ name: "working", job });
    await archiveJob(job.id);
    removeJob(job.id);
    setStage(null);
    setOpenRowId(null);
    setToastMessage("Job archived");
  }

  if (jobs.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-500">No jobs here yet.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <SwipeableRow
              isOpen={openRowId === job.id}
              onOpenChange={(open) => setOpenRowId(open ? job.id : null)}
              onDelete={() => setStage({ name: "confirm", job })}
              className="rounded-2xl border border-neutral-200 shadow-sm shadow-neutral-900/[0.03] dark:border-neutral-800"
            >
              <JobRow
                job={job}
                brandColors={brandColors}
                onRequestDelete={() => setStage({ name: "confirm", job })}
              />
            </SwipeableRow>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={stage?.name === "confirm"}
        onClose={() => setStage(null)}
        title="Delete job?"
        message="This will permanently delete this job. This action cannot be undone."
        confirmLabel="Delete Job"
        confirming={stage?.name === "working"}
        onConfirm={() => stage && handleDelete(stage.job)}
      />

      {stage?.name === "blocked" ? (
        <ConfirmDialog
          open
          onClose={() => setStage(null)}
          title="Can't delete this job"
          message={`${stage.reason} Archive it instead to hide it from the list without losing anything.`}
          confirmLabel="Archive Job"
          destructive={false}
          onConfirm={() => handleArchive(stage.job)}
        />
      ) : null}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  );
}

function JobRow({
  job,
  brandColors,
  onRequestDelete,
}: {
  job: JobListRow;
  brandColors: BrandColors;
  onRequestDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  // Flip the dropdown to open upward when there isn't room below the
  // trigger -- e.g. a row near the bottom of a long list -- so its options
  // stay fully visible and tappable instead of clipping past the viewport
  // edge. Runs before paint so there's no visible flicker.
  useLayoutEffect(() => {
    if (!menuOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets flip state for the next open; depends on menuOpen itself, can't be derived during render
      setOpenUpward(false);
      return;
    }
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect && rect.bottom > window.innerHeight) {
      setOpenUpward(true);
    }
  }, [menuOpen]);

  const PropertyIcon = PROPERTY_TYPE_ICONS[job.propertyType];

  return (
    <div className="flex items-stretch gap-0 bg-white pr-1 dark:bg-neutral-900">
      <span
        aria-hidden
        className="w-1.5 shrink-0"
        style={{ backgroundColor: railColor(job.job_status, brandColors) }}
      />

      <Link
        href={`/jobs/${job.id}`}
        className="flex min-w-0 flex-1 items-start justify-between gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={clsx(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              PROPERTY_TYPE_COLORS[job.propertyType].icon,
            )}
          >
            <PropertyIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {job.address}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {job.customerName ?? "No customer"}
              {job.nextVisit
                ? ` · ${formatVisitDate(job.nextVisit.scheduled_date)}${
                    job.nextVisit.start_time ? ` ${formatVisitTime(job.nextVisit.start_time)}` : ""
                  }`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <JobStatusBadge status={job.job_status} invoiceStatus={job.invoice_status} />
          {job.invoice_status !== "Not Required" ? (
            <InvoiceStatusBadge status={job.invoice_status} />
          ) : null}
        </div>
      </Link>

      <div ref={menuRef} className="relative hidden shrink-0 self-start sm:block">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Job actions"
          className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div
            ref={panelRef}
            className={clsx(
              "absolute right-0 z-10 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900",
              openUpward ? "bottom-full mb-1" : "top-full mt-1",
            )}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRequestDelete();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Delete job
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
