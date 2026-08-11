"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  JobStatus,
  VisitStatus,
  VariationStatus,
  TestResult,
  CertificateStatus,
  NoticeStatus,
} from "@/types/database";

function revalidateSchedule() {
  revalidatePath("/jobs");
  revalidatePath("/jobs/calendar");
  revalidatePath("/");
}

export async function createJob(formData: FormData) {
  const propertyId = formData.get("property_id") as string;
  const primaryContactId = (formData.get("primary_contact_id") as string) || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      property_id: propertyId,
      primary_contact_id: primaryContactId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create job");
  }

  revalidatePath("/jobs");
  revalidatePath("/");
  redirect(`/jobs/${data.id}`);
}

export async function updateJobStatus(jobId: string, jobStatus: JobStatus) {
  const supabase = await createClient();

  // Closing is the one manual transition with a real guard: an outstanding
  // invoice must never get buried by flipping the job to Closed.
  if (jobStatus === "Closed") {
    const { data: job } = await supabase
      .from("jobs")
      .select("invoice_status")
      .eq("id", jobId)
      .single();
    if (job && job.invoice_status !== "Paid" && job.invoice_status !== "Not Required") {
      throw new Error("Can't close -- invoice still outstanding.");
    }
  }

  await supabase.from("jobs").update({ job_status: jobStatus }).eq("id", jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/");
}

function formatList(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export interface DeleteJobResult {
  deleted: boolean;
  blockedReason: string | null;
}

// Only ever hard-deletes the job row itself (job_visits cascade with it --
// nothing else does) and never touches the linked customer/property. If the
// job has any real record attached, deletion is refused outright rather
// than silently destroying history -- the caller should offer archiveJob
// instead. RLS (business_id = current_business_id()) already scopes every
// query and the final delete, same as everywhere else in the app -- a job
// belonging to another business simply won't be found.
export async function deleteJob(jobId: string): Promise<DeleteJobResult> {
  const supabase = await createClient();

  const [jobRes, quotesRes, invoicesRes, testRecordsRes, complianceRes, documentsRes] =
    await Promise.all([
      supabase.from("jobs").select("job_status").eq("id", jobId).single(),
      supabase.from("quotes").select("id").eq("job_id", jobId).limit(1),
      // payments only ever exist via an invoice (payments.invoice_id is not
      // null), so an invoices check already covers them -- no separate query.
      supabase.from("invoices").select("id").eq("job_id", jobId).limit(1),
      supabase.from("test_records").select("id").eq("job_id", jobId).limit(1),
      supabase.from("compliance_documents").select("id").eq("job_id", jobId).limit(1),
      supabase.from("documents").select("id").eq("job_id", jobId).limit(1),
    ]);

  if (!jobRes.data) {
    // Not found (already deleted, or belongs to another business under
    // RLS) -- nothing left to do.
    return { deleted: false, blockedReason: null };
  }

  const reasons: string[] = [];
  if ((quotesRes.data?.length ?? 0) > 0) reasons.push("a quote");
  if ((invoicesRes.data?.length ?? 0) > 0) reasons.push("an invoice or payment");
  if (jobRes.data.job_status === "Completed") reasons.push("a Completed status");
  if ((testRecordsRes.data?.length ?? 0) > 0) reasons.push("test records");
  if ((complianceRes.data?.length ?? 0) > 0) reasons.push("compliance documents");
  if ((documentsRes.data?.length ?? 0) > 0) reasons.push("documents or photos");

  if (reasons.length > 0) {
    return {
      deleted: false,
      blockedReason: `This job has ${formatList(reasons)} attached, so it can't be permanently deleted.`,
    };
  }

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw new Error(error.message);

  revalidatePath("/jobs");
  revalidatePath("/");
  return { deleted: true, blockedReason: null };
}

export async function archiveJob(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ archived: true }).eq("id", jobId);
  if (error) throw new Error(error.message);

  revalidatePath("/jobs");
  revalidatePath("/");
}

export async function createVisit(jobId: string, formData: FormData) {
  const scheduledDate = formData.get("scheduled_date") as string;
  const startTime = (formData.get("start_time") as string) || null;
  const durationRaw = formData.get("expected_duration_minutes") as string;
  const assignedWorker = (formData.get("assigned_worker") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("job_visits").insert({
    job_id: jobId,
    scheduled_date: scheduledDate,
    start_time: startTime,
    expected_duration_minutes: durationRaw ? Number(durationRaw) : null,
    assigned_worker: assignedWorker,
    notes,
  });

  if (error) throw new Error(error.message);

  // Ready to Schedule -> Scheduled fires only the first time a job gets a
  // visit -- same atomic-conditional-update pattern used for quote-driven
  // job status transitions (see quotes/actions.ts).
  const { count: visitCount } = await supabase
    .from("job_visits")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if (visitCount === 1) {
    await supabase
      .from("jobs")
      .update({ job_status: "Scheduled" })
      .eq("id", jobId)
      .eq("job_status", "Ready to Schedule")
      .is("outcome", null);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidateSchedule();
}

export async function updateVisit(visitId: string, jobId: string, formData: FormData) {
  const scheduledDate = formData.get("scheduled_date") as string;
  const startTime = (formData.get("start_time") as string) || null;
  const durationRaw = formData.get("expected_duration_minutes") as string;
  const assignedWorker = (formData.get("assigned_worker") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_visits")
    .update({
      scheduled_date: scheduledDate,
      start_time: startTime,
      expected_duration_minutes: durationRaw ? Number(durationRaw) : null,
      assigned_worker: assignedWorker,
      notes,
    })
    .eq("id", visitId);

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
  revalidateSchedule();
}

export async function updateVisitStatus(visitId: string, jobId: string, visitStatus: VisitStatus) {
  const supabase = await createClient();
  await supabase.from("job_visits").update({ visit_status: visitStatus }).eq("id", visitId);

  // On Site -> Completed fires once every visit on the job is Completed --
  // not just the one just updated, so re-check the whole set each time.
  if (visitStatus === "Completed") {
    const { data: visits } = await supabase
      .from("job_visits")
      .select("visit_status")
      .eq("job_id", jobId);
    const allCompleted = (visits ?? []).every((v) => v.visit_status === "Completed");
    if (allCompleted) {
      await supabase
        .from("jobs")
        .update({ job_status: "Completed" })
        .eq("id", jobId)
        .eq("job_status", "On Site")
        .is("outcome", null);
    }
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidateSchedule();
}

export async function deleteVisit(visitId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("job_visits").delete().eq("id", visitId);
  revalidatePath(`/jobs/${jobId}`);
  revalidateSchedule();
}

export async function createVariation(jobId: string, formData: FormData) {
  const description = formData.get("description") as string;
  const amount = Number(formData.get("amount"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_variations")
    .insert({ job_id: jobId, description, amount });

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateVariation(variationId: string, jobId: string, formData: FormData) {
  const description = formData.get("description") as string;
  const amount = Number(formData.get("amount"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_variations")
    .update({ description, amount })
    .eq("id", variationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateVariationStatus(
  variationId: string,
  jobId: string,
  status: VariationStatus,
) {
  const supabase = await createClient();
  await supabase.from("job_variations").update({ status }).eq("id", variationId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteVariation(variationId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("job_variations").delete().eq("id", variationId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function createTestRecord(jobId: string, formData: FormData) {
  const circuitOrEquipment = formData.get("circuit_or_equipment") as string;
  const testTypeId = formData.get("test_type_id") as string;
  const customTestTypeLabel = (formData.get("custom_test_type_label") as string) || null;
  const measuredValueRaw = formData.get("measured_value") as string;
  const unit = (formData.get("unit") as string) || null;
  const result = formData.get("result") as TestResult;
  const instrumentUsed = (formData.get("instrument_used") as string) || null;
  const testedBy = (formData.get("tested_by") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("test_records").insert({
    job_id: jobId,
    circuit_or_equipment: circuitOrEquipment,
    test_type_id: testTypeId,
    custom_test_type_label: customTestTypeLabel,
    measured_value: measuredValueRaw ? Number(measuredValueRaw) : null,
    unit,
    result,
    instrument_used: instrumentUsed,
    tested_by: testedBy,
    notes,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteTestRecord(testRecordId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("test_records").delete().eq("id", testRecordId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function updateJobComplianceStatus(jobId: string, formData: FormData) {
  const requiresTesting = formData.get("requires_testing") === "on";
  const requiresCertificate = formData.get("requires_certificate") === "on";
  const certificateStatus = formData.get("certificate_status") as CertificateStatus;
  const requiresNotice = formData.get("requires_notice") === "on";
  const noticeStatus = formData.get("notice_status") as NoticeStatus;

  const supabase = await createClient();
  const { error } = await supabase.from("job_compliance_status").upsert({
    job_id: jobId,
    requires_testing: requiresTesting,
    requires_certificate: requiresCertificate,
    certificate_status: certificateStatus,
    requires_notice: requiresNotice,
    notice_status: noticeStatus,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
}
