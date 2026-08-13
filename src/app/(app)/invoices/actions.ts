"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedQuote } from "@/lib/quotes";
import { dueDateFromTerms } from "@/lib/payment-terms";
import { todayDateString } from "@/lib/format";
import { generateShareToken } from "@/lib/tokens";
import type { PaymentTerms, InvoiceAmountType, InvoiceRecordStatus } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidateInvoice(invoiceId: string, jobId: string) {
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finances/invoices");
  revalidatePath("/finances/payments");
  revalidatePath("/finances");
}

// Recomputed server-side (never trusted from the client) so a stale or
// tampered client value can never lock in a wrong invoice amount.
async function getJobRevisedContractValue(supabase: SupabaseServerClient, jobId: string) {
  const [acceptedQuote, variationsRes] = await Promise.all([
    getAcceptedQuote(supabase, jobId),
    supabase.from("job_variations").select("amount").eq("job_id", jobId).eq("status", "Approved"),
  ]);

  const originalContractValue = acceptedQuote?.total ?? 0;
  const approvedVariations = (variationsRes.data ?? []).reduce(
    (sum, v) => sum + Number(v.amount),
    0,
  );
  return originalContractValue + approvedVariations;
}

export async function createAdHocInvoice(jobId: string, formData: FormData) {
  const stageLabel = (formData.get("stage_label") as string) || null;
  const amountType = formData.get("amount_type") as InvoiceAmountType;
  const percentageRaw = formData.get("percentage") as string;
  const issueDate = (formData.get("issue_date") as string) || todayDateString();
  const paymentTerms = formData.get("payment_terms") as PaymentTerms;
  const dueDate = dueDateFromTerms(issueDate, paymentTerms);

  const supabase = await createClient();

  // A percentage-type ad hoc invoice still resolves against the job's
  // current revised contract value, computed server-side -- only the final
  // dollar amount is stored and locked in from this point on.
  let amount: number;
  if (amountType === "percentage") {
    const percentage = Number(percentageRaw);
    const revisedContractValue = await getJobRevisedContractValue(supabase, jobId);
    amount = Number(((revisedContractValue * percentage) / 100).toFixed(2));
  } else {
    amount = Number(formData.get("amount"));
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      job_id: jobId,
      stage_label: stageLabel,
      amount_type: amountType,
      percentage: amountType === "percentage" ? Number(percentageRaw) : null,
      amount,
      issue_date: issueDate,
      payment_terms: paymentTerms,
      due_date: dueDate,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finances");

  return { id: data.id as string };
}

export async function createInvoicesFromTemplate(jobId: string, formData: FormData) {
  const stagesJson = formData.get("stages") as string;
  const stages: { label: string; percentage: number }[] = JSON.parse(stagesJson);
  const issueDate = (formData.get("issue_date") as string) || todayDateString();
  const paymentTerms = formData.get("payment_terms") as PaymentTerms;
  const dueDate = dueDateFromTerms(issueDate, paymentTerms);

  const supabase = await createClient();
  const revisedContractValue = await getJobRevisedContractValue(supabase, jobId);

  const rows = stages.map((stage) => ({
    job_id: jobId,
    stage_label: stage.label,
    amount_type: "percentage" as const,
    percentage: stage.percentage,
    amount: Number(((revisedContractValue * stage.percentage) / 100).toFixed(2)),
    issue_date: issueDate,
    payment_terms: paymentTerms,
    due_date: dueDate,
  }));

  const { error } = await supabase.from("invoices").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finances");
}

export async function updateInvoice(invoiceId: string, jobId: string, formData: FormData) {
  const stageLabel = (formData.get("stage_label") as string) || null;
  const amountType = formData.get("amount_type") as InvoiceAmountType;
  const percentageRaw = formData.get("percentage") as string;
  const amount = Number(formData.get("amount"));
  const issueDate = formData.get("issue_date") as string;
  const paymentTerms = formData.get("payment_terms") as PaymentTerms;
  const dueDate = dueDateFromTerms(issueDate, paymentTerms);

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      stage_label: stageLabel,
      amount_type: amountType,
      percentage: percentageRaw ? Number(percentageRaw) : null,
      amount,
      issue_date: issueDate,
      payment_terms: paymentTerms,
      due_date: dueDate,
    })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  revalidateInvoice(invoiceId, jobId);
}

// Paid and Partially Paid are derived live from actual payment records (see
// recompute_invoice_status in the invoices migration, triggered on every
// payments change) -- never a manual, independent choice. Draft/Sent/
// Overdue/Void/Written Off stay deliberate, manual states.
const MANUALLY_SETTABLE_STATUSES = new Set<InvoiceRecordStatus>([
  "Draft",
  "Sent",
  "Overdue",
  "Void",
  "Written Off",
]);

export async function updateInvoiceStatus(
  invoiceId: string,
  jobId: string,
  status: InvoiceRecordStatus,
) {
  // Same "never trust the client" reasoning as assertQuoteIsDraft in
  // quotes/actions.ts -- Server Actions are reachable directly by anyone who
  // can POST to them, so this can't rely on the dropdown simply not
  // offering the derived statuses as options.
  if (!MANUALLY_SETTABLE_STATUSES.has(status)) {
    throw new Error(`${status} is derived from recorded payments and can't be set manually.`);
  }

  const supabase = await createClient();
  await supabase.from("invoices").update({ status }).eq("id", invoiceId);
  revalidateInvoice(invoiceId, jobId);
}

export async function deleteInvoice(invoiceId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("invoices").delete().eq("id", invoiceId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finances");
}

export async function recordPayment(invoiceId: string, jobId: string, formData: FormData) {
  const amount = Number(formData.get("amount"));
  const paidDate = (formData.get("paid_date") as string) || todayDateString();
  const method = (formData.get("method") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    paid_date: paidDate,
    method,
    notes,
  });

  if (error) throw new Error(error.message);

  revalidateInvoice(invoiceId, jobId);
}

export async function deletePayment(paymentId: string, invoiceId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", paymentId);
  revalidateInvoice(invoiceId, jobId);
}

export async function getOrCreateInvoiceShareToken(invoiceId: string): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("invoice_public_tokens")
    .select("token")
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (existing?.token) return existing.token;

  const token = generateShareToken();
  const { error } = await supabase
    .from("invoice_public_tokens")
    .insert({ invoice_id: invoiceId, token });

  if (error) throw new Error(error.message);
  return token;
}

// Same "sharing = sending" convention as shareQuote: a Draft invoice moves
// to Sent the moment a link exists to share, rather than needing a
// separate manual status flip afterward. Paid/Partially Paid/Overdue are
// already handled elsewhere (payments trigger, cron); this only ever
// touches a Draft invoice.
export async function shareInvoice(invoiceId: string, jobId: string): Promise<{ token: string }> {
  const supabase = await createClient();
  const token = await getOrCreateInvoiceShareToken(invoiceId);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .single();

  if (invoice?.status === "Draft") {
    await supabase.from("invoices").update({ status: "Sent" }).eq("id", invoiceId);
  }

  revalidateInvoice(invoiceId, jobId);
  return { token };
}
