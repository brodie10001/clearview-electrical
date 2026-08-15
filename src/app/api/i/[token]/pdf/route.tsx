import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAcceptedQuote } from "@/lib/quotes";
import {
  InvoiceDocument,
  DEFAULT_PDF_SETTINGS,
  type InvoicePdfData,
  type InvoicePdfQuoteLine,
  type InvoicePdfQuoteServiceLine,
  type InvoicePdfQuoteContext,
  type BusinessSettingsPdf,
} from "@/lib/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const allowed = await checkRateLimit("invoice-pdf", { maxRequests: 20, windowSeconds: 300 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createServiceClient();

  // Same rule as the public page and the public quote PDF route: resolve
  // the token to exactly one invoice_id (and its business_id) first, then
  // scope every query to it.
  const { data: tokenRow } = await supabase
    .from("invoice_public_tokens")
    .select("invoice_id, invoices(business_id)")
    .eq("token", token)
    .maybeSingle<{ invoice_id: string; invoices: { business_id: string } | null }>();

  if (!tokenRow || !tokenRow.invoices) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const businessId = tokenRow.invoices.business_id;

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, stage_label, amount, issue_date, due_date, payment_terms, status, job_id, jobs(id, properties(address, customers(name, email, phone, billing_address)))",
      )
      .eq("id", tokenRow.invoice_id)
      .single()
      .returns<InvoicePdfData & { job_id: string }>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, invoice_footer, business_email, business_phone, business_address, bank_bsb, bank_account_name, bank_account_number, payment_instructions",
      )
      .eq("business_id", businessId)
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoice = invoiceRes.data;
  const pdfSettings: BusinessSettingsPdf = settingsRes.data ?? DEFAULT_PDF_SETTINGS;

  let quoteLines: InvoicePdfQuoteLine[] = [];
  let quoteServiceLines: InvoicePdfQuoteServiceLine[] = [];
  let quoteContext: InvoicePdfQuoteContext | null = null;

  const acceptedQuote = await getAcceptedQuote(supabase, invoice.job_id);
  if (acceptedQuote) {
    const [contextRes, linesRes, serviceLinesRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("subtotal, gst_amount, gst_applied, notes")
        .eq("id", acceptedQuote.id)
        .single()
        .returns<InvoicePdfQuoteContext>(),
      supabase
        .from("quote_line_items")
        .select(
          "line_type, description, rate_per_hour, hours, quantity, sell_price, line_total, labour_rate_types(name)",
        )
        .eq("quote_id", acceptedQuote.id)
        .order("created_at", { ascending: true })
        .returns<InvoicePdfQuoteLine[]>(),
      supabase
        .from("quote_service_item_lines")
        .select("customer_facing_description, quantity, unit_sell_price, line_total")
        .eq("quote_id", acceptedQuote.id)
        .order("created_at", { ascending: true })
        .returns<InvoicePdfQuoteServiceLine[]>(),
    ]);

    quoteContext = contextRes.data ?? null;
    quoteLines = linesRes.data ?? [];
    quoteServiceLines = serviceLinesRes.data ?? [];
  }

  const buffer = await renderToBuffer(
    <InvoiceDocument
      invoice={invoice}
      quoteLines={quoteLines}
      quoteServiceLines={quoteServiceLines}
      quoteContext={quoteContext}
      settings={pdfSettings}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
