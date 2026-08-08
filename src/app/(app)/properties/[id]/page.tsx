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
}

export interface PropertyJobData {
  id: string;
  job_status: JobStatus;
  created_at: string;
  createdAtLabel: string;
  nextVisitLabel: string | null;
}

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
        .select("id, type, photo_category, file_url, caption, created_at")
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
  const { data: visitsData } =
    jobIds.length > 0
      ? await supabase
          .from("job_visits")
          .select("job_id, scheduled_date, start_time")
          .in("job_id", jobIds)
          .order("scheduled_date", { ascending: true })
          .order("start_time", { ascending: true, nullsFirst: false })
          .returns<{ job_id: string; scheduled_date: string; start_time: string | null }[]>()
      : { data: [] as { job_id: string; scheduled_date: string; start_time: string | null }[] };

  const today = todayDateString();
  const nextVisitByJob = new Map<string, { scheduled_date: string; start_time: string | null }>();
  for (const visit of visitsData ?? []) {
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

  return (
    <PropertyTabs
      property={propertyRes.data}
      propertyCreatedAtLabel={formatDate(propertyRes.data.created_at)}
      access={accessRes.data as PropertyAccessData | null}
      electrical={electricalRes.data as PropertyElectricalData | null}
      contacts={contactsRes.data ?? []}
      documents={documents}
      jobs={jobs}
      allContacts={allContactsRes.data ?? []}
    />
  );
}
