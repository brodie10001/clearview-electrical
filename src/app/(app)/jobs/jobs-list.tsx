"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { JobStatusBadge, InvoiceStatusBadge } from "@/components/ui/status-badge";
import { formatVisitDate, formatVisitTime } from "@/lib/format";
import { deleteJob, archiveJob } from "./actions";
import type { JobStatus, InvoiceStatus } from "@/types/database";

export interface JobListRow {
  id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
  address: string;
  customerName: string | null;
  nextVisit: { scheduled_date: string; start_time: string | null } | null;
}

type DeleteStage =
  | { name: "confirm"; job: JobListRow }
  | { name: "blocked"; job: JobListRow; reason: string }
  | { name: "working"; job: JobListRow };

export function JobsList({ jobs: initialJobs }: { jobs: JobListRow[] }) {
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
      <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {jobs.map((job) => (
          <li key={job.id}>
            <SwipeableRow
              isOpen={openRowId === job.id}
              onOpenChange={(open) => setOpenRowId(open ? job.id : null)}
              onDelete={() => setStage({ name: "confirm", job })}
            >
              <JobRow job={job} onRequestDelete={() => setStage({ name: "confirm", job })} />
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

function JobRow({ job, onRequestDelete }: { job: JobListRow; onRequestDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex items-center gap-1 bg-white pr-1 dark:bg-neutral-900">
      <Link
        href={`/jobs/${job.id}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
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
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <JobStatusBadge status={job.job_status} invoiceStatus={job.invoice_status} />
          <InvoiceStatusBadge status={job.invoice_status} />
        </div>
      </Link>

      <div ref={menuRef} className="relative hidden shrink-0 sm:block">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Job actions"
          className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div className="absolute top-full right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
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
