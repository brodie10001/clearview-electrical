import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { QuoteBuilder } from "./quote-builder";
import type { QuoteStatus, QuoteLineType } from "@/types/database";

export interface QuoteDetailData {
  id: string;
  job_id: string;
  status: QuoteStatus;
  expiry_date: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  gst_applied: boolean;
  created_at: string;
  jobs: {
    id: string;
    properties: { id: string; address: string; customers: { name: string } | null } | null;
  } | null;
}

export interface QuoteLineItemData {
  id: string;
  line_type: QuoteLineType;
  description: string | null;
  labour_rate_type_id: string | null;
  rate_per_hour: number | null;
  hours: number | null;
  cost: number | null;
  markup_percent: number | null;
  quantity: number | null;
  sell_price: number | null;
  line_total: number;
  labour_rate_types: { name: string } | null;
}

export interface ActiveLabourRateType {
  id: string;
  name: string;
  rate_per_hour: number;
}

export default async function QuoteDetailPage({ params }: PageProps<"/quotes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [quoteRes, lineItemsRes, rateTypesRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, job_id, status, expiry_date, subtotal, gst_amount, total, gst_applied, created_at, jobs(id, properties(id, address, customers(name)))",
      )
      .eq("id", id)
      .single()
      .returns<QuoteDetailData>(),
    supabase
      .from("quote_line_items")
      .select(
        "id, line_type, description, labour_rate_type_id, rate_per_hour, hours, cost, markup_percent, quantity, sell_price, line_total, labour_rate_types(name)",
      )
      .eq("quote_id", id)
      .order("created_at", { ascending: true })
      .returns<QuoteLineItemData[]>(),
    supabase
      .from("labour_rate_types")
      .select("id, name, rate_per_hour")
      .eq("is_active", true)
      .order("sort_order")
      .returns<ActiveLabourRateType[]>(),
    supabase.from("business_settings").select("default_material_markup_percent").eq("id", true).single(),
  ]);

  if (quoteRes.error || !quoteRes.data) notFound();
  const quote = quoteRes.data;
  const property = quote.jobs?.properties;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <Link
          href={`/jobs/${quote.job_id}`}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
        >
          <MapPin className="h-3.5 w-3.5" />
          {property?.address ?? "Unknown property"}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Quote for {property?.customers?.name ?? "customer"}
        </h1>
        <p className="text-xs text-neutral-500">Created {formatDate(quote.created_at)}</p>
      </div>

      <QuoteBuilder
        quote={quote}
        lineItems={lineItemsRes.data ?? []}
        activeRateTypes={rateTypesRes.data ?? []}
        defaultMarkupPercent={settingsRes.data?.default_material_markup_percent ?? 30}
      />
    </div>
  );
}
