import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatVisitDate, formatVisitTime, todayDateString } from "@/lib/format";
import { PropertyTabs } from "./property-tabs";
import type {
  PropertyType,
  PropertyStatus,
  PropertyContactRole,
  PhaseType,
  DocumentType,
  PhotoCategory,
  JobStatus,
  QuoteStatus,
  InvoiceRecordStatus,
  TestResult,
  ComplianceDocumentStatus,
} from "@/types/database";

export interface PropertyDetailData {
  id: string;
  address: string;
  gps_lat: number | null;
  gps_lng: number | null;
  property_type: PropertyType;
  status: PropertyStatus;
  created_at: string;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
}

export interface PropertyAccessData {
  gate_code: string | null;
  alarm_instructions: string | null;
  lockbox_location: string | null;
  parking_instructions: string | null;
  pets_notes: string | null;
  hazards_notes: string | null;
  ceiling_access_notes: string | null;
  roof_access_notes: string | null;
  restricted_areas_notes: string | null;
}

export interface PropertyElectricalData {
  switchboard_location: string | null;
  switchboard_brand: string | null;
  main_switch_rating: string | null;
  phase_type: PhaseType | null;
  consumer_mains_size: string | null;
  meter_number: string | null;
  solar_installed: boolean;
  battery_installed: boolean;
  generator_installed: boolean;
  surge_protection: boolean;
  ev_charger: boolean;
  existing_rcds: string | null;
  existing_rcbos: string | null;
  main_earth_location: string | null;
  men_location: string | null;
}

export interface PropertyContactData {
  id: string;
  role: PropertyContactRole;
  contacts: { id: string; name: string; phone: string | null; email: string | null } | null;
}

export interface PropertyDocumentData {
  id: string;
  type: DocumentType;
  photo_category: PhotoCategory | null;
  file_url: string;
  caption: string | null;
  created_at: string;
  createdAtLabel: string;
  job_id?: string | null;
}

export interface PropertyJobData {
  id: string;
  job_status: JobStatus;
  created_at: string;
  createdAtLabel: string;
  nextVisitLabel: string | null;
}

export type PropertyFeedItem =
  | {
      kind: "job";
      id: string;
      date: string;
      dateLabel: string;
      job_status: JobStatus;
      nextVisitLabel: string | null;
    }
  | {
      kind: "quote";
      id: string;
      date: string;
      dateLabel: string;
      quote_number: string;
      status: QuoteStatus;
      total: number;
    }
  | {
      kind: "invoice";
      id: string;
      date: string;
      dateLabel: string;
      invoice_number: string;
      status: InvoiceRecordStatus;
      amount: number;
    }
  | {
      kind: "document";
      id: string;
      date: string;
      dateLabel: string;
      type: DocumentType;
      photo_category: PhotoCategory | null;
      caption: string | null;
      job_id: string | null;
    }
  | {
      kind: "test_record";
      id: string;
      date: string;
      dateLabel: string;
      circuit_or_equipment: string;
      result: TestResult;
      test_type_name: string;
      job_id: string;
    }
  | {
      kind: "compliance_document";
      id: string;
      date: string;
      dateLabel: string;
      template_name: string;
      status: ComplianceDocumentStatus;
    };

export default async function PropertyDetailPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [propertyRes, accessRes, electricalRes, contactsRes, documentsRes, jobsRes, allContactsRes] =
    await Promise.all([
      supabase
        .from("properties")
        .select("id, address, gps_lat, gps_lng, property_type, status, created_at, customers(id, name, phone, email)")
        .eq("id", id)
        .single()
        .returns<PropertyDetailData>(),
      supabase.from("property_access").select("*").eq("property_id", id).maybeSingle(),
      supabase.from("property_electrical").select("*").eq("property_id", id).maybeSingle(),
      supabase
        .from("property_contacts")
        .select("id, role, contacts(id, name, phone, email)")
        .eq("property_id", id)
        .returns<PropertyContactData[]>(),
      supabase
        .from("documents")
        .select("id, type, photo_category, file_url, caption, created_at, job_id")
        .eq("property_id", id)
        .order("created_at", { ascending: false })
        .returns<Omit<PropertyDocumentData, "createdAtLabel">[]>(),
      supabase
        .from("jobs")
        .select("id, job_status, created_at")
        .eq("property_id", id)
        .order("created_at", { ascending: false })
        .returns<Omit<PropertyJobData, "createdAtLabel" | "nextVisitLabel">[]>(),
      supabase.from("contacts").select("id, name").order("name"),
    ]);

  if (propertyRes.error || !propertyRes.data) notFound();

  const documents: PropertyDocumentData[] = (documentsRes.data ?? []).map((doc) => ({
    ...doc,
    createdAtLabel: formatDate(doc.created_at),
  }));

  const jobIds = (jobsRes.data ?? []).map((j) => j.id);

  const [visitsRes, quotesRes, invoicesRes, testRecordsRes, complianceDocsRes] = await Promise.all([
    jobIds.length > 0
      ? supabase
          .from("job_visits")
          .select("job_id, scheduled_date, start_time")
          .in("job_id", jobIds)
          .order("scheduled_date", { ascending: true })
          .order("start_time", { ascending: true, nullsFirst: false })
          .returns<{ job_id: string; scheduled_date: string; start_time: string | null }[]>()
      : Promise.resolve({ data: [] as { job_id: string; scheduled_date: string; start_time: string | null }[] }),
    jobIds.length > 0
      ? supabase
          .from("quotes")
          .select("id, quote_number, status, total, created_at")
          .in("job_id", jobIds)
          .returns<{ id: string; quote_number: string; status: QuoteStatus; total: number; created_at: string }[]>()
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? supabase
          .from("invoices")
          .select("id, invoice_number, status, amount, created_at")
          .in("job_id", jobIds)
          .returns<
            { id: string; invoice_number: string; status: InvoiceRecordStatus; amount: number; created_at: string }[]
          >()
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? supabase
          .from("test_records")
          .select("id, job_id, circuit_or_equipment, result, tested_at, test_types(name)")
          .in("job_id", jobIds)
          .returns<
            {
              id: string;
              job_id: string;
              circuit_or_equipment: string;
              result: TestResult;
              tested_at: string;
              test_types: { name: string } | null;
            }[]
          >()
      : Promise.resolve({ data: [] }),
    supabase
      .from("compliance_documents")
      .select("id, status, created_at, compliance_document_templates(name)")
      .eq("property_id", id)
      .returns<
        { id: string; status: ComplianceDocumentStatus; created_at: string; compliance_document_templates: { name: string } | null }[]
      >(),
  ]);

  const visitsData = visitsRes.data ?? [];

  const today = todayDateString();
  const nextVisitByJob = new Map<string, { scheduled_date: string; start_time: string | null }>();
  for (const visit of visitsData) {
    if (visit.scheduled_date < today) continue;
    if (!nextVisitByJob.has(visit.job_id)) nextVisitByJob.set(visit.job_id, visit);
  }

  const jobs: PropertyJobData[] = (jobsRes.data ?? []).map((job) => {
    const nextVisit = nextVisitByJob.get(job.id);
    return {
      ...job,
      createdAtLabel: formatDate(job.created_at),
      nextVisitLabel: nextVisit
        ? `${formatVisitDate(nextVisit.scheduled_date)}${
            nextVisit.start_time ? ` ${formatVisitTime(nextVisit.start_time)}` : ""
          }`
        : null,
    };
  });

  const feed: PropertyFeedItem[] = [
    ...jobs.map(
      (job): PropertyFeedItem => ({
        kind: "job",
        id: job.id,
        date: job.created_at,
        dateLabel: job.createdAtLabel,
        job_status: job.job_status,
        nextVisitLabel: job.nextVisitLabel,
      }),
    ),
    ...(quotesRes.data ?? []).map(
      (quote): PropertyFeedItem => ({
        kind: "quote",
        id: quote.id,
        date: quote.created_at,
        dateLabel: formatDate(quote.created_at),
        quote_number: quote.quote_number,
        status: quote.status,
        total: quote.total,
      }),
    ),
    ...(invoicesRes.data ?? []).map(
      (invoice): PropertyFeedItem => ({
        kind: "invoice",
        id: invoice.id,
        date: invoice.created_at,
        dateLabel: formatDate(invoice.created_at),
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        amount: invoice.amount,
      }),
    ),
    ...documents.map(
      (doc): PropertyFeedItem => ({
        kind: "document",
        id: doc.id,
        date: doc.created_at,
        dateLabel: doc.createdAtLabel,
        type: doc.type,
        photo_category: doc.photo_category,
        caption: doc.caption,
        job_id: doc.job_id ?? null,
      }),
    ),
    ...(testRecordsRes.data ?? []).map(
      (record): PropertyFeedItem => ({
        kind: "test_record",
        id: record.id,
        date: record.tested_at,
        dateLabel: formatDate(record.tested_at),
        circuit_or_equipment: record.circuit_or_equipment,
        result: record.result,
        test_type_name: record.test_types?.name ?? "Test",
        job_id: record.job_id,
      }),
    ),
    ...(complianceDocsRes.data ?? []).map(
      (doc): PropertyFeedItem => ({
        kind: "compliance_document",
        id: doc.id,
        date: doc.created_at,
        dateLabel: formatDate(doc.created_at),
        template_name: doc.compliance_document_templates?.name ?? "Document",
        status: doc.status,
      }),
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <PropertyTabs
      property={propertyRes.data}
      propertyCreatedAtLabel={formatDate(propertyRes.data.created_at)}
      access={accessRes.data as PropertyAccessData | null}
      electrical={electricalRes.data as PropertyElectricalData | null}
      contacts={contactsRes.data ?? []}
      documents={documents}
      jobs={jobs}
      feed={feed}
      allContacts={allContactsRes.data ?? []}
    />
  );
}
