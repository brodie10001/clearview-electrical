import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { QuoteBuilder } from "./quote-builder";
import type { QuoteStatus, QuoteLineType } from "@/types/database";
import type { QuoteActivityItem } from "./quote-activity-timeline";

export interface QuoteDetailData {
  id: string;
  job_id: string;
  quote_number: string;
  status: QuoteStatus;
  expiry_date: string | null;
  notes: string | null;
  version: number;
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

export interface QuoteServiceItemLineData {
  id: string;
  name: string;
  customer_facing_description: string;
  quantity: number;
  unit_sell_price: number;
  line_total: number;
  labour_cost: number;
  materials_cost: number;
  consumables_cost: number;
  estimated_profit: number;
  estimated_margin_percent: number;
}

export interface ActiveLabourRateType {
  id: string;
  name: string;
  rate_per_hour: number;
}

export default async function QuoteDetailPage({ params }: PageProps<"/quotes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [quoteRes, lineItemsRes, serviceItemLinesRes, rateTypesRes, settingsRes, activityRes] =
    await Promise.all([
      supabase
        .from("quotes")
        .select(
          "id, job_id, quote_number, status, expiry_date, notes, version, subtotal, gst_amount, total, gst_applied, created_at, jobs(id, properties(id, address, customers(name)))",
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
        .from("quote_service_item_lines")
        .select(
          "id, name, customer_facing_description, quantity, unit_sell_price, line_total, labour_cost, materials_cost, consumables_cost, estimated_profit, estimated_margin_percent",
        )
        .eq("quote_id", id)
        .order("created_at", { ascending: true })
        .returns<QuoteServiceItemLineData[]>(),
      supabase
        .from("labour_rate_types")
        .select("id, name, rate_per_hour")
        .eq("is_active", true)
        .order("sort_order")
        .returns<ActiveLabourRateType[]>(),
      supabase
        .from("business_settings")
        .select("default_material_markup_percent, trading_name")
        .single(),
      supabase
        .from("quote_activity")
        .select("id, event_type, note, created_at")
        .eq("quote_id", id)
        .order("created_at", { ascending: false })
        .returns<QuoteActivityItem[]>(),
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
        <p className="text-xs text-neutral-500">
          {quote.quote_number} · Created {formatDate(quote.created_at)}
        </p>
      </div>

      <QuoteBuilder
        quote={quote}
        lineItems={lineItemsRes.data ?? []}
        serviceItemLines={serviceItemLinesRes.data ?? []}
        activeRateTypes={rateTypesRes.data ?? []}
        defaultMarkupPercent={settingsRes.data?.default_material_markup_percent ?? 30}
        tradingName={settingsRes.data?.trading_name || "your electrician"}
        customerName={property?.customers?.name ?? "there"}
        activity={activityRes.data ?? []}
      />
    </div>
  );
}
