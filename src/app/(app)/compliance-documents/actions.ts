"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/format";
import type { ComplianceDocumentStatus, ComplianceFieldDef } from "@/types/database";

function revalidateComplianceDocument(documentId: string, jobId: string) {
  revalidatePath(`/compliance-documents/${documentId}`);
  revalidatePath(`/jobs/${jobId}`);
}

export async function createComplianceDocument(
  jobId: string,
  propertyId: string,
  templateId: string,
): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compliance_documents")
    .insert({ job_id: jobId, property_id: propertyId, template_id: templateId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
  return { id: data.id };
}

export async function updateComplianceDocumentFields(
  documentId: string,
  jobId: string,
  fieldSchema: ComplianceFieldDef[],
  formData: FormData,
) {
  const fieldValues: Record<string, unknown> = {};
  for (const field of fieldSchema) {
    if (field.type === "checkbox") {
      fieldValues[field.key] = formData.get(field.key) === "on";
    } else if (field.type === "number") {
      const raw = formData.get(field.key) as string;
      fieldValues[field.key] = raw ? Number(raw) : null;
    } else {
      const raw = (formData.get(field.key) as string) || null;
      fieldValues[field.key] = raw;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_documents")
    .update({ field_values: fieldValues })
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  revalidateComplianceDocument(documentId, jobId);
}

export async function updateComplianceDocumentStatus(
  documentId: string,
  jobId: string,
  status: ComplianceDocumentStatus,
) {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("compliance_documents")
    .select("issued_date")
    .eq("id", documentId)
    .single();

  const updates: { status: ComplianceDocumentStatus; issued_date?: string } = { status };
  // First time a document is marked Issued, stamp the date automatically --
  // still editable afterward via updateComplianceDocumentDetails.
  if (status === "Issued" && !current?.issued_date) {
    updates.issued_date = todayDateString();
  }

  const { error } = await supabase.from("compliance_documents").update(updates).eq("id", documentId);
  if (error) throw new Error(error.message);

  revalidateComplianceDocument(documentId, jobId);
}

export async function updateComplianceDocumentDetails(
  documentId: string,
  jobId: string,
  formData: FormData,
) {
  const externalReference = (formData.get("external_reference") as string) || null;
  const issuedDate = (formData.get("issued_date") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("compliance_documents")
    .update({ external_reference: externalReference, issued_date: issuedDate })
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  revalidateComplianceDocument(documentId, jobId);
}

export async function deleteComplianceDocument(documentId: string, jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("compliance_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
}
