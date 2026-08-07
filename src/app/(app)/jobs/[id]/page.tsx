import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, ImageIcon, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobControls } from "./job-controls";
import { formatDate, formatTime } from "@/lib/format";
import { QuoteStatusBadge } from "@/components/ui/status-badge";
import { createQuote } from "@/app/(app)/quotes/actions";
import type { JobStatus, InvoiceStatus, DocumentType, QuoteStatus } from "@/types/database";

interface JobDetail {
  id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
  outcome: string | null;
  scheduled_at: string | null;
  created_at: string;
  property_id: string;
  properties: {
    address: string;
    property_type: string;
    customers: { id: string; name: string } | null;
  } | null;
  contacts: { name: string; phone: string | null; email: string | null } | null;
}

export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, job_status, invoice_status, outcome, scheduled_at, created_at, property_id, properties(address, property_type, customers(id, name)), contacts(name, phone, email)",
    )
    .eq("id", id)
    .single()
    .returns<JobDetail>();

  if (!job) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, type, caption, created_at")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .returns<{ id: string; type: DocumentType; caption: string | null; created_at: string }[]>();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, status, total, created_at")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .returns<{ id: string; status: QuoteStatus; total: number; created_at: string }[]>();

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <Link
          href={`/properties/${job.property_id}`}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
        >
          <MapPin className="h-3.5 w-3.5" />
          {job.properties?.address ?? "Unknown property"}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          {job.properties?.customers?.name ?? "Job"}
        </h1>
        <p className="text-xs text-neutral-500">
          Created {formatDate(job.created_at)} at {formatTime(job.created_at)}
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <JobControls
          jobId={job.id}
          jobStatus={job.job_status}
          invoiceStatus={job.invoice_status}
          scheduledAt={job.scheduled_at}
        />
      </section>

      {job.contacts ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Primary contact
          </h2>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {job.contacts.name}
          </p>
          <div className="mt-1 flex flex-col gap-1 text-sm text-neutral-500">
            {job.contacts.phone ? (
              <a href={`tel:${job.contacts.phone}`} className="flex items-center gap-1.5 hover:text-amber-600">
                <Phone className="h-3.5 w-3.5" /> {job.contacts.phone}
              </a>
            ) : null}
            {job.contacts.email ? (
              <a href={`mailto:${job.contacts.email}`} className="flex items-center gap-1.5 hover:text-amber-600">
                <Mail className="h-3.5 w-3.5" /> {job.contacts.email}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Quotes</h2>
          <form action={createQuote}>
            <input type="hidden" name="job_id" value={job.id} />
            <button
              type="submit"
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> New Quote
            </button>
          </form>
        </div>
        {!quotes || quotes.length === 0 ? (
          <p className="text-sm text-neutral-500">No quotes for this job yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/quotes/${quote.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      ${quote.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-neutral-500">{formatDate(quote.created_at)}</p>
                  </div>
                  <QuoteStatusBadge status={quote.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Documents
        </h2>
        {!documents || documents.length === 0 ? (
          <p className="text-sm text-neutral-500">No documents attached to this job yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <ImageIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-900 dark:text-neutral-50">
                    {doc.caption || doc.type.replace("_", " ")}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(doc.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
