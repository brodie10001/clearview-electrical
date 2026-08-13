"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Mail, FileText, Plus, CalendarClock, Wallet, Info, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { JobControls } from "./job-controls";
import { VisitsSection, type VisitData, type WorkerOption } from "./visits-section";
import { VariationsSection, type VariationData } from "./variations-section";
import { InvoicesSection, type InvoiceListItem, type TemplateOption, type TemplateStageOption } from "./invoices-section";
import { BillingSummary } from "./billing-summary";
import { ComplianceSection, type TestRecordData, type TestTypeOption, type ComplianceDocumentListItem, type ComplianceTemplateOption, type JobComplianceStatusData } from "./compliance-section";
import { DocumentsList } from "@/components/documents/documents-list";
import { formatDate } from "@/lib/format";
import { createQuote } from "@/app/(app)/quotes/actions";
import { QuoteStatusBadge } from "@/components/ui/status-badge";
import type { computeJobBilling } from "@/lib/billing";
import type {
  JobStatus,
  InvoiceStatus,
  InvoiceRecordStatus,
  QuoteStatus,
  PaymentTerms,
} from "@/types/database";

const TABS = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "compliance", label: "Compliance", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface JobDetail {
  id: string;
  property_id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
  outcome: string | null;
  contacts: { name: string; phone: string | null; email: string | null } | null;
}

export function JobTabs({
  job,
  visits,
  workers,
  documents,
  quotes,
  variations,
  invoices,
  templates,
  templateStages,
  billing,
  defaultPaymentTerms,
  today,
  complianceComplete,
  testingCompleted,
  jobComplianceStatus,
  testRecords,
  testTypes,
  complianceDocuments,
  complianceTemplates,
  canManageFinances,
}: {
  job: JobDetail;
  visits: VisitData[];
  workers: WorkerOption[];
  documents: Parameters<typeof DocumentsList>[0]["documents"];
  quotes: { id: string; quote_number: string; status: QuoteStatus; total: number; created_at: string }[];
  variations: VariationData[];
  invoices: (InvoiceListItem & { status: InvoiceRecordStatus; payments: { amount: number }[] })[];
  templates: TemplateOption[];
  templateStages: TemplateStageOption[];
  billing: ReturnType<typeof computeJobBilling>;
  defaultPaymentTerms: PaymentTerms;
  today: string;
  complianceComplete: boolean;
  testingCompleted: boolean;
  jobComplianceStatus: JobComplianceStatusData | null;
  testRecords: TestRecordData[];
  testTypes: TestTypeOption[];
  complianceDocuments: ComplianceDocumentListItem[];
  complianceTemplates: ComplianceTemplateOption[];
  canManageFinances: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.key === "compliance" && !complianceComplete ? (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <JobControls jobId={job.id} jobStatus={job.job_status} invoiceStatus={job.invoice_status} />
          </section>

          {canManageFinances ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                <Wallet className="h-4 w-4" /> Billing summary
              </h2>
              <BillingSummary billing={billing} />
            </section>
          ) : null}

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              <CalendarClock className="h-4 w-4" /> Visits
            </h2>
            <VisitsSection jobId={job.id} visits={visits} workers={workers} />
          </section>

          {job.contacts ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Primary contact
              </h2>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{job.contacts.name}</p>
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

          {canManageFinances ? (
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
              {quotes.length === 0 ? (
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
                          <p className="text-xs text-neutral-500">
                            {quote.quote_number} · {formatDate(quote.created_at)}
                          </p>
                        </div>
                        <QuoteStatusBadge status={quote.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Variations</h2>
            <VariationsSection jobId={job.id} variations={variations} />
          </section>

          {canManageFinances ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Invoices</h2>
              <InvoicesSection
                jobId={job.id}
                invoices={invoices}
                templates={templates}
                templateStages={templateStages}
                revisedContractValue={billing.revisedContractValue}
                remainingToInvoice={billing.remainingToInvoice}
                defaultPaymentTerms={defaultPaymentTerms}
                today={today}
              />
            </section>
          ) : null}

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Documents</h2>
            <DocumentsList documents={documents} revalidatePaths={[`/jobs/${job.id}`]} />
          </section>
        </div>
      ) : (
        <ComplianceSection
          jobId={job.id}
          propertyId={job.property_id}
          testingCompleted={testingCompleted}
          complianceComplete={complianceComplete}
          jobComplianceStatus={jobComplianceStatus}
          testRecords={testRecords}
          testTypes={testTypes}
          workers={workers}
          complianceDocuments={complianceDocuments}
          complianceTemplates={complianceTemplates}
        />
      )}
    </div>
  );
}
