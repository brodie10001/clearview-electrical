"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, InvoiceStatus, VisitStatus } from "@/types/database";

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
  await supabase.from("jobs").update({ job_status: jobStatus }).eq("id", jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/");
}

export async function updateInvoiceStatus(jobId: string, invoiceStatus: InvoiceStatus) {
  const supabase = await createClient();
  await supabase.from("jobs").update({ invoice_status: invoiceStatus }).eq("id", jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/finances");
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
  revalidatePath(`/jobs/${jobId}`);
  revalidateSchedule();
}

export async function deleteVisit(visitId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("job_visits").delete().eq("id", visitId);
  revalidatePath(`/jobs/${jobId}`);
  revalidateSchedule();
}
