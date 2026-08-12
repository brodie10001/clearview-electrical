import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, stage_label, amount, issue_date, due_date, payment_terms, status, jobs(id, properties(address, customers(name, email, phone, billing_address)))",
      )
      .eq("id", id)
      .single()
      .returns<InvoicePdfData>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, invoice_footer, business_email, business_phone, business_address, bank_bsb, bank_account_name, bank_account_number, payment_instructions",
      )
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const invoice = invoiceRes.data;
  const pdfSettings: BusinessSettingsPdf = settingsRes.data ?? DEFAULT_PDF_SETTINGS;

  // A staged invoice (Deposit, Progress Payment, etc.) is a portion of the
  // job, not a specific set of line items -- it shows Scope of Work as
  // context instead of trying to prorate individual lines against a partial
  // amount. A full-amount invoice has no stage_label and reuses the
  // accepted quote's own itemized breakdown, since it bills for the whole
  // job in one go and should match what the customer already agreed to.
  let quoteLines: InvoicePdfQuoteLine[] = [];
  let quoteServiceLines: InvoicePdfQuoteServiceLine[] = [];
  let quoteContext: InvoicePdfQuoteContext | null = null;

  const jobId = invoice.jobs?.id;
  if (jobId) {
    const acceptedQuote = await getAcceptedQuote(supabase, jobId);
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
