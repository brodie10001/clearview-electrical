import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getCurrentProfile } from "@/lib/data/current-business";
import { JobTabs } from "./job-tabs";
import type { VisitData, WorkerOption } from "./visits-section";
import type { VariationData } from "./variations-section";
import type { InvoiceListItem, TemplateOption, TemplateStageOption } from "./invoices-section";
import type {
  JobComplianceStatusData,
  TestRecordData,
  TestTypeOption,
  CircuitOption,
  ComplianceDocumentListItem,
  ComplianceTemplateOption,
} from "./compliance-section";
import { formatDate, formatTime, todayDateString } from "@/lib/format";
import { getAcceptedQuote } from "@/lib/quotes";
import { computeJobBilling } from "@/lib/billing";
import { computeJobCompliance } from "@/lib/compliance";
import type {
  JobStatus,
  InvoiceStatus,
  InvoiceRecordStatus,
  DocumentType,
  PhotoCategory,
  QuoteStatus,
  PaymentTerms,
} from "@/types/database";

interface JobDetail {
  id: string;
  job_status: JobStatus;
  invoice_status: InvoiceStatus;
  outcome: string | null;
  created_at: string;
  property_id: string;
  properties: {
    address: string;
    property_type: string;
    customers: { id: string; name: string; payment_terms: PaymentTerms | null } | null;
  } | null;
  contacts: { name: string; phone: string | null; email: string | null } | null;
}

export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getRequestUser();
  const profile = user ? await getCurrentProfile(user.id) : null;
  const canManageFinances = profile?.role === "owner" || profile?.role === "admin";

  // Every one of these only depends on `id` (already known from params), not
  // on each other's results, so they all run as one parallel batch instead
  // of a chain of sequential round-trips.
  const [
    jobRes,
    visitsRes,
    workersRes,
    documentsRes,
    quotesRes,
    variationsRes,
    invoicesRes,
    templatesRes,
    stagesRes,
    businessSettingsRes,
    acceptedQuote,
    complianceStatusRes,
    testRecordsRes,
    testTypesRes,
    complianceDocumentsRes,
    complianceTemplatesRes,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, job_status, invoice_status, outcome, created_at, property_id, properties(address, property_type, customers(id, name, payment_terms)), contacts(name, phone, email)",
      )
      .eq("id", id)
      .single()
      .returns<JobDetail>(),
    supabase
      .from("job_visits")
      .select("id, scheduled_date, start_time, expected_duration_minutes, assigned_worker, notes, visit_status")
      .eq("job_id", id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .returns<VisitData[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("active", true)
      .returns<WorkerOption[]>(),
    supabase
      .from("documents")
      .select("id, type, photo_category, caption, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .returns<
        {
          id: string;
          type: DocumentType;
          photo_category: PhotoCategory | null;
          caption: string | null;
          created_at: string;
        }[]
      >(),
    supabase
      .from("quotes")
      .select("id, quote_number, status, total, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .returns<
        { id: string; quote_number: string; status: QuoteStatus; total: number; created_at: string }[]
      >(),
    supabase
      .from("job_variations")
      .select("id, description, amount, status")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .returns<VariationData[]>(),
    supabase
      .from("invoices")
      .select("id, invoice_number, stage_label, amount, status, issue_date, due_date, payments(amount)")
      .eq("job_id", id)
      .order("issue_date", { ascending: false })
      .returns<
        (InvoiceListItem & { status: InvoiceRecordStatus; payments: { amount: number }[] })[]
      >(),
    supabase.from("payment_schedule_templates").select("id, name").order("name").returns<TemplateOption[]>(),
    supabase
      .from("payment_schedule_template_stages")
      .select("id, template_id, label, percentage")
      .order("sort_order")
      .returns<TemplateStageOption[]>(),
    supabase.from("business_settings").select("default_payment_terms").single(),
    getAcceptedQuote(supabase, id),
    supabase
      .from("job_compliance_status")
      .select("requires_testing, requires_certificate, certificate_status, requires_notice, notice_status")
      .eq("job_id", id)
      .maybeSingle()
      .returns<JobComplianceStatusData>(),
    supabase
      .from("test_records")
      .select(
        "id, circuit_id, circuit_or_equipment, test_type_id, custom_test_type_label, measured_value, unit, result, instrument_used, tested_at, notes, is_superseded, supersedes_id, amended_reason, test_types(name), profiles(full_name, email)",
      )
      .eq("job_id", id)
      .order("tested_at", { ascending: false })
      .returns<TestRecordData[]>(),
    supabase
      .from("test_types")
      .select("id, name, default_unit, is_custom")
      .eq("active", true)
      .returns<TestTypeOption[]>(),
    supabase
      .from("compliance_documents")
      .select("id, status, issued_date, created_at, compliance_document_templates(name, category)")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .returns<ComplianceDocumentListItem[]>(),
    supabase
      .from("compliance_document_templates")
      .select("id, name, category")
      .eq("active", true)
      .returns<ComplianceTemplateOption[]>(),
  ]);

  const job = jobRes.data;
  if (!job) notFound();

  // Depends on job.property_id, only known once jobRes resolves -- the
  // reusable circuit schedule the test sheet reads/writes, so a board
  // entered on any past job at this property shows up here too.
  const circuitsRes = await supabase
    .from("property_circuits")
    .select(
      "id, switchboard_ref, circuit_number, description, protective_device_type, protective_device_rating, rcd_protected, rcd_ref",
    )
    .eq("property_id", job.property_id)
    .eq("is_active", true)
    .order("sort_order")
    .returns<CircuitOption[]>();

  const visits = visitsRes.data;
  const workers = workersRes.data;
  const documentsData = documentsRes.data;
  const quotes = quotesRes.data;
  const variations = variationsRes.data;

  const documents = (documentsData ?? []).map((doc) => ({
    ...doc,
    createdAtLabel: formatDate(doc.created_at),
  }));

  const invoices = invoicesRes.data ?? [];
  const approvedVariationsSum = (variations ?? [])
    .filter((v) => v.status === "Approved")
    .reduce((sum, v) => sum + v.amount, 0);

  const billing = computeJobBilling({
    acceptedQuoteTotal: acceptedQuote?.total ?? 0,
    approvedVariationsSum,
    invoices: invoices.map((inv) => ({
      amount: inv.amount,
      status: inv.status,
      paidAmount: inv.payments.reduce((sum, p) => sum + p.amount, 0),
    })),
  });

  const jobComplianceStatus = complianceStatusRes.data;
  const testRecords = testRecordsRes.data ?? [];
  const hasUnresolvedFailedTest = testRecords.some(
    (record) => record.result === "Fail" && !record.is_superseded,
  );
  const { testingCompleted, complianceComplete } = computeJobCompliance({
    requiresTesting: jobComplianceStatus?.requires_testing ?? false,
    hasTestRecords: testRecords.length > 0,
    hasUnresolvedFailedTest,
    requiresCertificate: jobComplianceStatus?.requires_certificate ?? false,
    certificateStatus: jobComplianceStatus?.certificate_status ?? "Not Required",
    requiresNotice: jobComplianceStatus?.requires_notice ?? false,
    noticeStatus: jobComplianceStatus?.notice_status ?? "Not Required",
  });

  const defaultPaymentTerms: PaymentTerms =
    job.properties?.customers?.payment_terms ?? businessSettingsRes.data?.default_payment_terms ?? "7 days";

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

      <JobTabs
        job={job}
        visits={visits ?? []}
        workers={workers ?? []}
        documents={documents}
        quotes={quotes ?? []}
        variations={variations ?? []}
        invoices={invoices}
        templates={templatesRes.data ?? []}
        templateStages={stagesRes.data ?? []}
        billing={billing}
        defaultPaymentTerms={defaultPaymentTerms}
        today={todayDateString()}
        complianceComplete={complianceComplete}
        testingCompleted={testingCompleted}
        jobComplianceStatus={jobComplianceStatus ?? null}
        testRecords={testRecords}
        testTypes={testTypesRes.data ?? []}
        circuits={circuitsRes.data ?? []}
        currentUserId={user!.id}
        complianceDocuments={complianceDocumentsRes.data ?? []}
        complianceTemplates={complianceTemplatesRes.data ?? []}
        canManageFinances={canManageFinances}
      />
    </div>
  );
}
