import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  QuoteDocument,
  DEFAULT_PDF_SETTINGS,
  type QuotePdfData,
  type QuotePdfLine,
  type BusinessSettingsPdf,
} from "@/lib/quote-pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [quoteRes, linesRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, expiry_date, notes, subtotal, gst_amount, total, gst_applied, created_at, jobs(properties(address, customers(name, email, phone)))",
      )
      .eq("id", id)
      .single()
      .returns<QuotePdfData>(),
    supabase
      .from("quote_line_items")
      .select(
        "line_type, description, rate_per_hour, hours, cost, markup_percent, quantity, sell_price, line_total, labour_rate_types(name)",
      )
      .eq("quote_id", id)
      .order("created_at", { ascending: true })
      .returns<QuotePdfLine[]>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, quote_header, quote_terms",
      )
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (quoteRes.error || !quoteRes.data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
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
