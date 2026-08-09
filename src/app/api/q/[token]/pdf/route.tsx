import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/service";
import {
  QuoteDocument,
  DEFAULT_PDF_SETTINGS,
  type QuotePdfData,
  type QuotePdfLine,
  type BusinessSettingsPdf,
} from "@/lib/quote-pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Same rule as the public page: resolve the token to exactly one quote_id
  // (and its business_id, needed for the business_settings lookup below
  // since this runs with no logged-in user for RLS to key off) first, then
  // scope every query to it.
  const { data: tokenRow } = await supabase
    .from("quote_public_tokens")
    .select("quote_id, quotes(business_id)")
    .eq("token", token)
    .maybeSingle<{ quote_id: string; quotes: { business_id: string } | null }>();

  if (!tokenRow || !tokenRow.quotes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const businessId = tokenRow.quotes.business_id;

  const [quoteRes, linesRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, expiry_date, notes, subtotal, gst_amount, total, gst_applied, created_at, jobs(properties(address, customers(name, email, phone)))",
      )
      .eq("id", tokenRow.quote_id)
      .single()
      .returns<QuotePdfData>(),
    supabase
      .from("quote_line_items")
      .select(
        "line_type, description, rate_per_hour, hours, cost, markup_percent, quantity, sell_price, line_total, labour_rate_types(name)",
      )
      .eq("quote_id", tokenRow.quote_id)
      .order("created_at", { ascending: true })
      .returns<QuotePdfLine[]>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, quote_header, quote_terms",
      )
      .eq("business_id", businessId)
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (quoteRes.error || !quoteRes.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfSettings: BusinessSettingsPdf = settingsRes.data ?? DEFAULT_PDF_SETTINGS;

  const buffer = await renderToBuffer(
    <QuoteDocument quote={quoteRes.data} lines={linesRes.data ?? []} settings={pdfSettings} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quoteRes.data.quote_number}.pdf"`,
    },
  });
}
