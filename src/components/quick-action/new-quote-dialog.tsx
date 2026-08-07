"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { createQuote } from "@/app/(app)/quotes/actions";

interface JobOption {
  id: string;
  properties: { address: string; customers: { name: string } | null } | null;
}

export function NewQuoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobId, setJobId] = useState("");

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("jobs")
      .select("id, properties(address, customers(name))")
      .order("created_at", { ascending: false })
      .returns<JobOption[]>()
      .then(({ data }) => setJobs(data ?? []));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="New quote">
      <form action={createQuote} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Job</label>
          <select
            name="job_id"
            required
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            <option value="" disabled>
              Select a job...
            </option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.properties?.address ?? "Unknown property"}
                {job.properties?.customers?.name ? ` — ${job.properties.customers.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!jobId}
          className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          Create quote
        </button>
      </form>
    </Dialog>
  );
}
