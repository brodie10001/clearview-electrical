import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
import { ViewTracker } from "./view-tracker";
import type { QuoteStatus, QuoteLineType, CompanyFont } from "@/types/database";

interface PublicQuote {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  expiry_date: string | null;
  notes: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  gst_applied: boolean;
  jobs: {
    properties: { address: string; customers: { name: string } | null } | null;
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

interface PublicSettings {
  trading_name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_font: CompanyFont;
  quote_terms: string | null;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Resolve the token to exactly one quote_id (and, via it, the one
  // business that quote belongs to) first -- every query below is scoped
  // to those two ids, never anything derived from the request beyond them.
  // This runs on the service client (no logged-in user, so no
  // current_business_id() for RLS to key off), so business_id has to be
  // threaded through explicitly rather than left to row-level security.
  const { data: tokenRow } = await supabase
    .from("quote_public_tokens")
    .select("quote_id, quotes(business_id)")
    .eq("token", token)
    .maybeSingle<{ quote_id: string; quotes: { business_id: string } | null }>();

  if (!tokenRow || !tokenRow.quotes) notFound();
  const quoteId = tokenRow.quote_id;
  const businessId = tokenRow.quotes.business_id;

  const [quoteRes, linesRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, expiry_date, notes, subtotal, gst_amount, total, gst_applied, jobs(properties(address, customers(name)))",
      )
      .eq("id", quoteId)
      .single()
      .returns<PublicQuote>(),
    supabase
      .from("quote_line_items")
      .select("line_type, description, rate_per_hour, hours, quantity, sell_price, line_total, labour_rate_types(name)")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true })
      .returns<PublicLine[]>(),
    supabase
      .from("business_settings")
      .select("trading_name, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, quote_terms")
      .eq("business_id", businessId)
      .single()
      .returns<PublicSettings>(),
  ]);

  if (quoteRes.error || !quoteRes.data) notFound();

  const quote = quoteRes.data;
  const lines = linesRes.data ?? [];
  const settings = settingsRes.data ?? {
    trading_name: null,
    logo_url: null,
    logo_dark_url: null,
    primary_color: "#2E6DB4",
    secondary_color: "#0a0a0a",
    accent_color: "#4F9FE0",
    company_font: "Helvetica" as CompanyFont,
    quote_terms: null,
  };

  const property = quote.jobs?.properties;
  const customer = property?.customers;
  const logoUrl = settings.logo_url || settings.logo_dark_url;
  const labourLines = lines.filter((l) => l.line_type === "labour");
  const materialLines = lines.filter((l) => l.line_type === "material");

  return (
    <div className="min-h-dvh bg-neutral-50 px-4 py-8 sm:py-12">
      <ViewTracker token={token} />
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b-4 px-6 py-6" style={{ borderColor: settings.primary_color }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
              <img src={logoUrl} alt={settings.trading_name ?? "Logo"} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-lg font-bold" style={{ color: settings.primary_color }}>
                {settings.trading_name ?? "Quote"}
              </span>
            )}
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
              style={{ backgroundColor: settings.accent_color, color: "#ffffff" }}
            >
              {quote.status === "Rejected" ? "Declined" : quote.status}
            </span>
          </div>

          <div className="flex flex-col gap-6 px-6 py-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Quote {quote.quote_number}</h1>
              {quote.expiry_date ? (
                <p className="mt-1 text-sm text-neutral-500">
                  Valid until {formatDate(quote.expiry_date)}
                </p>
              ) : null}
            </div>

            <div
              className="rounded-lg border-l-4 bg-neutral-50 p-4"
              style={{ borderColor: settings.primary_color }}
            >
              <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Prepared for
              </p>
              <p className="mt-1 font-semibold text-neutral-900">{customer?.name ?? "Customer"}</p>
              {property?.address ? <p className="text-sm text-neutral-600">{property.address}</p> : null}
            </div>

            {quote.notes ? (
              <div>
                <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Scope of work
                </h2>
                <p className="whitespace-pre-wrap text-sm text-neutral-700">{quote.notes}</p>
              </div>
            ) : null}

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

            <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span className="text-neutral-900">{money(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">GST {quote.gst_applied ? "(10%)" : ""}</span>
                <span className="text-neutral-900">
                  {quote.gst_applied ? money(quote.gst_amount) : "Not applicable"}
                </span>
              </div>
              <div
                className="mt-1 flex justify-between rounded-lg px-3 py-2.5 text-base font-semibold"
                style={{ backgroundColor: settings.primary_color, color: "#ffffff" }}
              >
                <span>Total</span>
                <span>{money(quote.total)}</span>
              </div>
            </div>

            <a
              href={`/api/q/${token}/pdf`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>

            {settings.quote_terms ? (
              <div className="border-t border-neutral-100 pt-4">
                <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Terms &amp; conditions
                </h2>
                <p className="whitespace-pre-wrap text-xs text-neutral-500">{settings.quote_terms}</p>
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
