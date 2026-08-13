import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getAcceptedQuote } from "@/lib/quotes";
import { formatDate } from "@/lib/format";
import { CustomerResponse } from "./customer-response";
import type {
  InvoiceRecordStatus,
  PaymentTerms,
  QuoteLineType,
  CompanyFont,
} from "@/types/database";

interface PublicInvoice {
  id: string;
  invoice_number: string;
  stage_label: string | null;
  amount: number;
  due_date: string;
  payment_terms: PaymentTerms;
  status: InvoiceRecordStatus;
  job_id: string;
  customer_response: "Accepted" | "Declined" | null;
  customer_response_at: string | null;
  jobs: {
    properties: {
      address: string;
      customers: { name: string; billing_address: string | null } | null;
    } | null;
  } | null;
}

interface PublicLine {
  line_type: QuoteLineType;
  description: string | null;
  rate_per_hour: number | null;
  hours: number | null;
  quantity: number | null;
  sell_price: number | null;
  line_total: number;
  labour_rate_types: { name: string } | null;
}

interface PublicServiceLine {
  customer_facing_description: string;
  quantity: number;
  unit_sell_price: number;
  line_total: number;
}

interface PublicSettings {
  trading_name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_font: CompanyFont;
  invoice_footer: string | null;
  bank_bsb: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  payment_instructions: string | null;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function paymentTermsLabel(terms: PaymentTerms): string {
  return terms === "Due on Receipt" ? "Due on Receipt" : `Payment due within ${terms}`;
}

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Resolve the token to exactly one invoice_id (and, via it, the one
  // business that invoice belongs to) first -- same rule as the public
  // quote page. Every query below is scoped to those two ids only.
  const { data: tokenRow } = await supabase
    .from("invoice_public_tokens")
    .select("invoice_id, invoices(business_id)")
    .eq("token", token)
    .maybeSingle<{ invoice_id: string; invoices: { business_id: string } | null }>();

  if (!tokenRow || !tokenRow.invoices) notFound();
  const invoiceId = tokenRow.invoice_id;
  const businessId = tokenRow.invoices.business_id;

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, stage_label, amount, due_date, payment_terms, status, job_id, customer_response, customer_response_at, jobs(properties(address, customers(name, billing_address)))",
      )
      .eq("id", invoiceId)
      .single()
      .returns<PublicInvoice>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, invoice_footer, bank_bsb, bank_account_name, bank_account_number, payment_instructions",
      )
      .eq("business_id", businessId)
      .single()
      .returns<PublicSettings>(),
  ]);

  if (invoiceRes.error || !invoiceRes.data) notFound();
  const invoice = invoiceRes.data;

  const settings = settingsRes.data ?? {
    trading_name: null,
    logo_url: null,
    logo_dark_url: null,
    primary_color: "#2E6DB4",
    secondary_color: "#0a0a0a",
    accent_color: "#4F9FE0",
    company_font: "Helvetica" as CompanyFont,
    invoice_footer: null,
    bank_bsb: null,
    bank_account_name: null,
    bank_account_number: null,
    payment_instructions: null,
  };

  const isStaged = Boolean(invoice.stage_label);
  let lines: PublicLine[] = [];
  let serviceLines: PublicServiceLine[] = [];
  let scopeOfWork: string | null = null;
  let subtotal: number | null = null;
  let gstAmount: number | null = null;
  let gstApplied = false;

  const acceptedQuote = await getAcceptedQuote(supabase, invoice.job_id);
  if (acceptedQuote) {
    if (isStaged) {
      // Staged invoices only need the Scope of Work text as context --
      // never the itemized breakdown, which can't be prorated meaningfully
      // against a partial amount.
      const { data: quote } = await supabase
        .from("quotes")
        .select("notes")
        .eq("id", acceptedQuote.id)
        .single();
      scopeOfWork = quote?.notes ?? null;
    } else {
      const [quoteRes, linesRes, serviceLinesRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("subtotal, gst_amount, gst_applied, notes")
          .eq("id", acceptedQuote.id)
          .single(),
        supabase
          .from("quote_line_items")
          .select(
            "line_type, description, rate_per_hour, hours, quantity, sell_price, line_total, labour_rate_types(name)",
          )
          .eq("quote_id", acceptedQuote.id)
          .order("created_at", { ascending: true })
          .returns<PublicLine[]>(),
        supabase
          .from("quote_service_item_lines")
          .select("customer_facing_description, quantity, unit_sell_price, line_total")
          .eq("quote_id", acceptedQuote.id)
          .order("created_at", { ascending: true })
          .returns<PublicServiceLine[]>(),
      ]);
      lines = linesRes.data ?? [];
      serviceLines = serviceLinesRes.data ?? [];
      subtotal = quoteRes.data?.subtotal ?? null;
      gstAmount = quoteRes.data?.gst_amount ?? null;
      gstApplied = quoteRes.data?.gst_applied ?? false;
      scopeOfWork = quoteRes.data?.notes ?? null;
    }
  }

  const property = invoice.jobs?.properties;
  const customer = property?.customers;
  const billingAddress = customer?.billing_address || property?.address || null;
  const showSiteAddress = Boolean(property?.address) && !sameAddress(billingAddress, property!.address);
  const hasPaymentDetails = Boolean(
    settings.bank_bsb || settings.bank_account_name || settings.bank_account_number || settings.payment_instructions,
  );
  const logoUrl = settings.logo_url || settings.logo_dark_url;
  const labourLines = lines.filter((l) => l.line_type === "labour");
  const materialLines = lines.filter((l) => l.line_type === "material");

  return (
    <div className="min-h-dvh bg-neutral-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div
            className="flex items-center justify-between border-b-4 px-6 py-6"
            style={{ borderColor: settings.primary_color }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
              <img src={logoUrl} alt={settings.trading_name ?? "Logo"} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-lg font-bold" style={{ color: settings.primary_color }}>
                {settings.trading_name ?? "Invoice"}
              </span>
            )}
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
              style={{ backgroundColor: settings.accent_color, color: "#ffffff" }}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex flex-col gap-6 px-6 py-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Tax Invoice {invoice.invoice_number}</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Due {formatDate(invoice.due_date)} · {paymentTermsLabel(invoice.payment_terms)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div
                className="flex-1 rounded-lg border-l-4 bg-neutral-50 p-4"
                style={{ borderColor: settings.primary_color }}
              >
                <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Billed to</p>
                <p className="mt-1 font-semibold text-neutral-900">{customer?.name ?? "Customer"}</p>
                {billingAddress ? <p className="text-sm text-neutral-600">{billingAddress}</p> : null}
              </div>
              {showSiteAddress ? (
                <div className="flex-1 rounded-lg border-l-4 border-neutral-300 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Job site</p>
                  <p className="mt-1 text-sm text-neutral-600">{property!.address}</p>
                </div>
              ) : null}
            </div>

            {isStaged ? (
              <>
                {scopeOfWork ? (
                  <div>
                    <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                      Scope of work
                    </h2>
                    <p className="whitespace-pre-wrap text-sm text-neutral-700">{scopeOfWork}</p>
                  </div>
                ) : null}
                <p className="text-lg font-semibold text-neutral-900">{invoice.stage_label}</p>
              </>
            ) : (
              <>
                {labourLines.length > 0 ? (
                  <LineTable
                    title="Labour"
                    rows={labourLines.map((l) => ({
                      description: [l.labour_rate_types?.name, l.description].filter(Boolean).join(" — "),
                      qty: l.hours ? `${l.hours}h` : "",
                      rate: money(l.rate_per_hour ?? 0),
                      total: money(l.line_total),
                    }))}
                  />
                ) : null}
                {materialLines.length > 0 ? (
                  <LineTable
                    title="Materials"
                    rows={materialLines.map((l) => ({
                      description: l.description ?? "",
                      qty: String(l.quantity ?? 1),
                      rate: money(l.sell_price ?? 0),
                      total: money(l.line_total),
                    }))}
                  />
                ) : null}
                {serviceLines.length > 0 ? (
                  <LineTable
                    title="Services"
                    rows={serviceLines.map((l) => ({
                      description: l.customer_facing_description,
                      qty: String(l.quantity),
                      rate: money(l.unit_sell_price),
                      total: money(l.line_total),
                    }))}
                  />
                ) : null}
              </>
            )}

            <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
              {!isStaged && subtotal !== null ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="text-neutral-900">{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">GST {gstApplied ? "(10%)" : ""}</span>
                    <span className="text-neutral-900">
                      {gstApplied ? money(gstAmount ?? 0) : "Not applicable"}
                    </span>
                  </div>
                </>
              ) : null}
              <div
                className="mt-1 flex justify-between rounded-lg px-3 py-2.5 text-base font-semibold"
                style={{ backgroundColor: settings.primary_color, color: "#ffffff" }}
              >
                <span>Total</span>
                <span>{money(invoice.amount)}</span>
              </div>
            </div>

            <CustomerResponse
              token={token}
              initialResponse={invoice.customer_response}
              initialRespondedAt={invoice.customer_response_at}
            />

            <a
              href={`/api/i/${token}/pdf`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>

            {hasPaymentDetails ? (
              <div className="rounded-lg bg-neutral-50 p-4">
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Payment details
                </h2>
                {settings.bank_account_name ? (
                  <p className="text-sm text-neutral-700">Account name: {settings.bank_account_name}</p>
                ) : null}
                {settings.bank_bsb ? (
                  <p className="text-sm text-neutral-700">BSB: {settings.bank_bsb}</p>
                ) : null}
                {settings.bank_account_number ? (
                  <p className="text-sm text-neutral-700">Account number: {settings.bank_account_number}</p>
                ) : null}
                {settings.payment_instructions ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-500">
                    {settings.payment_instructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            {settings.invoice_footer ? (
              <div className="border-t border-neutral-100 pt-4">
                <p className="whitespace-pre-wrap text-xs text-neutral-500">{settings.invoice_footer}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function LineTable({
  title,
  rows,
}: {
  title: string;
  rows: { description: string; qty: string; rate: string; total: string }[];
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-3 py-2 text-neutral-900">{row.description}</td>
                <td className="px-3 py-2 text-right text-neutral-600">{row.qty}</td>
                <td className="px-3 py-2 text-right text-neutral-600">{row.rate}</td>
                <td className="px-3 py-2 text-right font-medium text-neutral-900">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
