"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteStatus } from "@/types/database";

const GST_RATE = 0.1;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function recalculateQuoteTotals(supabase: SupabaseServerClient, quoteId: string) {
  const { data: quote } = await supabase
    .from("quotes")
    .select("status, gst_applied")
    .eq("id", quoteId)
    .single();

  const { data: lines } = await supabase
    .from("quote_line_items")
    .select("line_total")
    .eq("quote_id", quoteId);

  const subtotal = (lines ?? []).reduce((sum, line) => sum + Number(line.line_total), 0);

  // While a quote is still a Draft, keep gst_applied in sync with the live
  // business setting. Once sent, freeze it so historical figures don't
  // silently change if GST registration status changes later.
  let gstApplied = quote?.gst_applied ?? false;
  if (quote?.status === "Draft") {
    const { data: settings } = await supabase
      .from("business_settings")
      .select("gst_registered")
      .eq("id", true)
      .single();
    gstApplied = settings?.gst_registered ?? false;
  }

  const gstAmount = gstApplied ? subtotal * GST_RATE : 0;
  const total = subtotal + gstAmount;

  await supabase
    .from("quotes")
    .update({ subtotal, gst_amount: gstAmount, total, gst_applied: gstApplied })
    .eq("id", quoteId);
}

function revalidateQuote(quoteId: string, jobId?: string) {
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/finances/quotes");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
}

export async function createQuote(formData: FormData) {
  const jobId = formData.get("job_id") as string;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({ job_id: jobId })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create quote");

  await recalculateQuoteTotals(supabase, data.id);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finances/quotes");
  redirect(`/quotes/${data.id}`);
}

export async function updateQuoteStatus(quoteId: string, jobId: string, status: QuoteStatus) {
  const supabase = await createClient();
  await supabase.from("quotes").update({ status }).eq("id", quoteId);
  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}

export async function updateQuoteExpiry(quoteId: string, jobId: string, expiryDate: string | null) {
  const supabase = await createClient();
  await supabase.from("quotes").update({ expiry_date: expiryDate }).eq("id", quoteId);
  revalidateQuote(quoteId, jobId);
}

export async function addLabourLine(quoteId: string, jobId: string, formData: FormData) {
  const labourRateTypeId = formData.get("labour_rate_type_id") as string;
  const hours = Number(formData.get("hours"));
  const description = (formData.get("description") as string) || null;

  const supabase = await createClient();
  const { data: rateType } = await supabase
    .from("labour_rate_types")
    .select("rate_per_hour")
    .eq("id", labourRateTypeId)
    .single();

  const ratePerHour = rateType?.rate_per_hour ?? 0;

  await supabase.from("quote_line_items").insert({
    quote_id: quoteId,
    line_type: "labour",
    labour_rate_type_id: labourRateTypeId,
    rate_per_hour: ratePerHour,
    hours,
    description,
    line_total: ratePerHour * hours,
  });

  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}

export async function addMaterialLine(quoteId: string, jobId: string, formData: FormData) {
  const description = formData.get("description") as string;
  const cost = Number(formData.get("cost"));
  const markupPercent = Number(formData.get("markup_percent"));

  const supabase = await createClient();
  await supabase.from("quote_line_items").insert({
    quote_id: quoteId,
    line_type: "material",
    description,
    cost,
    markup_percent: markupPercent,
    line_total: cost * (1 + markupPercent / 100),
  });

  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}

export async function updateLabourLine(
  lineId: string,
  quoteId: string,
  jobId: string,
  formData: FormData,
) {
  const hours = Number(formData.get("hours"));
  const ratePerHour = Number(formData.get("rate_per_hour"));
  const description = (formData.get("description") as string) || null;

  const supabase = await createClient();
  await supabase
    .from("quote_line_items")
    .update({ hours, rate_per_hour: ratePerHour, description, line_total: ratePerHour * hours })
    .eq("id", lineId);

  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}

export async function updateMaterialLine(
  lineId: string,
  quoteId: string,
  jobId: string,
  formData: FormData,
) {
  const description = formData.get("description") as string;
  const cost = Number(formData.get("cost"));
  const markupPercent = Number(formData.get("markup_percent"));

  const supabase = await createClient();
  await supabase
    .from("quote_line_items")
    .update({
      description,
      cost,
      markup_percent: markupPercent,
      line_total: cost * (1 + markupPercent / 100),
    })
    .eq("id", lineId);

  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}

export async function deleteLine(lineId: string, quoteId: string, jobId: string) {
  const supabase = await createClient();
  await supabase.from("quote_line_items").delete().eq("id", lineId);
  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}
