"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, InvoiceStatus } from "@/types/database";

export async function createJob(formData: FormData) {
  const propertyId = formData.get("property_id") as string;
  const primaryContactId = (formData.get("primary_contact_id") as string) || null;
  const scheduledAtRaw = formData.get("scheduled_at") as string;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      property_id: propertyId,
      primary_contact_id: primaryContactId,
      scheduled_at: scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null,
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

export async function updateScheduledAt(jobId: string, scheduledAt: string | null) {
  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null })
    .eq("id", jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/");
}
