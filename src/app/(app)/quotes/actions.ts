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

  const { data: previous } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .single();

  await supabase.from("quotes").update({ status }).eq("id", quoteId);
  await recalculateQuoteTotals(supabase, quoteId);

  // Auto-advance the job on the transition into Accepted (not on every save
  // of an already-accepted quote) — a one-off nudge, not an enforced link.
  // The user can freely change the job status back or forward afterward.
  if (status === "Accepted" && previous?.status !== "Accepted") {
    await supabase.from("jobs").update({ job_status: "Ready to Schedule" }).eq("id", jobId);
  }

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

// Adding a catalogue product to a quote copies its description, cost,
// markup %, and sell price onto the line as independent values -- the quote
// always displays/calculates from this stored snapshot, never a live
// catalogue reference, so later catalogue price changes never alter
// existing quotes. source_catalogue_product_id is kept only for reporting.
export async function addMaterialLine(quoteId: string, jobId: string, formData: FormData) {
  const supabase = await createClient();
  const catalogueProductId = formData.get("catalogue_product_id") as string | null;
  const quantity = Number(formData.get("quantity") || 1);

  if (catalogueProductId) {
    const { data: product } = await supabase
      .from("catalogue_products")
      .select("cost_price, default_markup_percent, sell_price, brand, product_name, generic_materials(name)")
      .eq("id", catalogueProductId)
      .single<{
        cost_price: number;
        default_markup_percent: number | null;
        sell_price: number;
        brand: string | null;
        product_name: string | null;
        generic_materials: { name: string } | null;
      }>();

    if (!product) throw new Error("Catalogue product not found");

    const { data: settings } = await supabase
      .from("business_settings")
      .select("default_material_markup_percent")
      .eq("id", true)
      .single();

    const markupPercent =
      product.default_markup_percent ?? settings?.default_material_markup_percent ?? 0;
    const productLabel = [product.brand, product.product_name].filter(Boolean).join(" ");
    const description = [product.generic_materials?.name, productLabel].filter(Boolean).join(" — ");

    await supabase.from("quote_line_items").insert({
      quote_id: quoteId,
      line_type: "material",
      description: description || "Material",
      cost: product.cost_price,
      markup_percent: markupPercent,
      quantity,
      sell_price: product.sell_price,
      source_catalogue_product_id: catalogueProductId,
      line_total: quantity * product.sell_price,
    });
  } else {
    const description = formData.get("description") as string;
    const cost = Number(formData.get("cost"));
    const markupPercent = Number(formData.get("markup_percent"));
    const sellPrice = cost * (1 + markupPercent / 100);

    await supabase.from("quote_line_items").insert({
      quote_id: quoteId,
      line_type: "material",
      description,
      cost,
      markup_percent: markupPercent,
      quantity,
      sell_price: sellPrice,
      source_catalogue_product_id: null,
      line_total: quantity * sellPrice,
    });
  }

  await recalculateQuoteTotals(supabase, quoteId);
  revalidateQuote(quoteId, jobId);
}

export interface CatalogueSearchResult {
  productId: string;
  materialId: string;
  materialName: string;
  brand: string | null;
  productName: string | null;
  sellPrice: number;
  isPreferred: boolean;
}

export async function searchCatalogueProducts(query: string): Promise<CatalogueSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const { data: materials } = await supabase
    .from("generic_materials")
    .select("id, name")
    .ilike("name", `%${trimmed}%`)
    .eq("active", true);

  if (!materials || materials.length === 0) return [];

  const materialNameById = new Map(materials.map((m) => [m.id, m.name]));
  const { data: products } = await supabase
    .from("catalogue_products")
    .select("id, generic_material_id, brand, product_name, sell_price, is_preferred")
    .in(
      "generic_material_id",
      materials.map((m) => m.id),
    )
    .eq("active", true)
    .order("is_preferred", { ascending: false })
    .order("brand");

  return (products ?? []).map((p) => ({
    productId: p.id,
    materialId: p.generic_material_id,
    materialName: materialNameById.get(p.generic_material_id) ?? "",
    brand: p.brand,
    productName: p.product_name,
    sellPrice: p.sell_price,
    isPreferred: p.is_preferred,
  }));
}

// "Frequently Used" is derived live from how often each catalogue product
// has actually appeared on past quotes -- not a manually maintained counter.
export async function getFrequentlyUsedProducts(limit = 8): Promise<CatalogueSearchResult[]> {
  const supabase = await createClient();
  const { data: lines } = await supabase
    .from("quote_line_items")
    .select("source_catalogue_product_id")
    .not("source_catalogue_product_id", "is", null);

  if (!lines || lines.length === 0) return [];

  const counts = new Map<string, number>();
  for (const line of lines) {
    const id = line.source_catalogue_product_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const topIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  const { data: products } = await supabase
    .from("catalogue_products")
    .select("id, generic_material_id, brand, product_name, sell_price, is_preferred, generic_materials(name)")
    .in("id", topIds)
    .eq("active", true)
    .returns<
      Array<{
        id: string;
        generic_material_id: string;
        brand: string | null;
        product_name: string | null;
        sell_price: number;
        is_preferred: boolean;
        generic_materials: { name: string } | null;
      }>
    >();

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  return topIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      productId: p.id,
      materialId: p.generic_material_id,
      materialName: p.generic_materials?.name ?? "",
      brand: p.brand,
      productName: p.product_name,
      sellPrice: p.sell_price,
      isPreferred: p.is_preferred,
    }));
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
  const quantity = Number(formData.get("quantity") || 1);
  const sellPrice = cost * (1 + markupPercent / 100);

  const supabase = await createClient();
  await supabase
    .from("quote_line_items")
    .update({
      description,
      cost,
      markup_percent: markupPercent,
      quantity,
      sell_price: sellPrice,
      line_total: quantity * sellPrice,
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
