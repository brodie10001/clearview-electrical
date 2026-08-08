import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { CompanyFont, QuoteStatus, QuoteLineType } from "@/types/database";

export const runtime = "nodejs";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// Relative luminance (WCAG) to decide black or white text on a colored
// background, so the PDF stays legible regardless of which brand colour the
// business picks.
function contrastText(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

// Light tint of a brand colour, used for subtle backgrounds (table headers,
// zebra striping) that stay on-brand without competing with body text.
function tint(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#f5f5f5";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

interface QuotePdfData {
  id: string;
  status: QuoteStatus;
  expiry_date: string | null;
  subtotal: number;
  gst_amount: number;
  total: number;
  gst_applied: boolean;
  created_at: string;
  jobs: {
    properties: {
      address: string;
      customers: { name: string; email: string | null; phone: string | null } | null;
    } | null;
  } | null;
}

interface QuotePdfLine {
  line_type: QuoteLineType;
  description: string | null;
  rate_per_hour: number | null;
  hours: number | null;
  cost: number | null;
  markup_percent: number | null;
  quantity: number | null;
  sell_price: number | null;
  line_total: number;
  labour_rate_types: { name: string } | null;
}

interface BusinessSettingsPdf {
  trading_name: string | null;
  abn: string | null;
  license_number: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_font: CompanyFont;
  quote_header: string | null;
}

function buildStyles(settings: BusinessSettingsPdf) {
  const headerTint = tint(settings.secondary_color, 0.96);
  const zebraTint = tint(settings.secondary_color, 0.97);
  const customerTint = tint(settings.primary_color, 0.94);

  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 44,
      fontSize: 9.5,
      color: settings.secondary_color,
    },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    logo: { width: 130, maxHeight: 56, objectFit: "contain" },
    wordmark: { fontSize: 20, fontWeight: 700, color: settings.primary_color },
    businessDetails: { alignItems: "flex-end" },
    businessDetailLine: { fontSize: 8.5, color: tint(settings.secondary_color, 0.35), marginBottom: 1.5 },
    businessDetailName: {
      fontSize: 9.5,
      fontWeight: 700,
      color: settings.secondary_color,
      marginBottom: 2,
    },
    divider: { height: 2.5, backgroundColor: settings.primary_color, marginTop: 16, marginBottom: 22 },

    metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
    quoteTitle: { fontSize: 22, fontWeight: 700, color: settings.secondary_color, marginBottom: 6 },
    metaLine: { fontSize: 8.5, color: tint(settings.secondary_color, 0.35), marginBottom: 1.5 },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 3,
      backgroundColor: settings.accent_color,
    },
    statusBadgeText: {
      fontSize: 8.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: contrastText(settings.accent_color),
    },

    customerBlock: {
      backgroundColor: customerTint,
      borderLeftWidth: 3,
      borderLeftColor: settings.primary_color,
      padding: 12,
      marginBottom: 20,
    },
    customerLabel: {
      fontSize: 7.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: tint(settings.secondary_color, 0.4),
      marginBottom: 4,
    },
    customerName: { fontSize: 11, fontWeight: 700, color: settings.secondary_color, marginBottom: 2 },
    customerLine: { fontSize: 9, color: tint(settings.secondary_color, 0.25), marginBottom: 1.5 },

    introText: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 20, color: settings.secondary_color },

    tableSection: { marginBottom: 18 },
    tableSectionTitle: {
      fontSize: 9.5,
      fontWeight: 700,
      color: settings.secondary_color,
      marginBottom: 6,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: headerTint,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableHeaderCell: {
      fontSize: 7.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: tint(settings.secondary_color, 0.35),
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#ececec",
    },
    tableRowAlt: { backgroundColor: zebraTint },
    tableCell: { fontSize: 9, color: settings.secondary_color },
    colDescription: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colRate: { flex: 1, textAlign: "right" },
    colTotal: { flex: 1, textAlign: "right" },

    totalsBlock: { marginTop: 8, alignItems: "flex-end" },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 220,
      marginBottom: 4,
    },
    totalsLabel: { fontSize: 9.5, color: tint(settings.secondary_color, 0.3) },
    totalsValue: { fontSize: 9.5, color: settings.secondary_color },
    grandTotalBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: 220,
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 4,
      backgroundColor: settings.primary_color,
    },
    grandTotalLabel: {
      fontSize: 11,
      fontWeight: 700,
      color: contrastText(settings.primary_color),
    },
    grandTotalValue: {
      fontSize: 15,
      fontWeight: 700,
      color: contrastText(settings.primary_color),
    },
  });
}

function QuoteDocument({
  quote,
  lines,
  settings,
}: {
  quote: QuotePdfData;
  lines: QuotePdfLine[];
  settings: BusinessSettingsPdf;
}) {
  const property = quote.jobs?.properties;
  const customer = property?.customers;
  const logoUrl = settings.logo_dark_url || settings.logo_url;
  const labourLines = lines.filter((l) => l.line_type === "labour");
  const materialLines = lines.filter((l) => l.line_type === "material");
  const styles = buildStyles(settings);

  return (
    <Document>
      <Page size="A4" style={{ ...styles.page, fontFamily: settings.company_font }}>
        <View style={styles.headerRow}>
          {logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.wordmark}>{settings.trading_name || "Quote"}</Text>
          )}
          <View style={styles.businessDetails}>
            {logoUrl && settings.trading_name ? (
              <Text style={styles.businessDetailName}>{settings.trading_name}</Text>
            ) : null}
            {settings.abn ? <Text style={styles.businessDetailLine}>ABN {settings.abn}</Text> : null}
            {settings.license_number ? (
              <Text style={styles.businessDetailLine}>Lic. {settings.license_number}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.quoteTitle}>Quote</Text>
            <Text style={styles.metaLine}>No. {quote.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.metaLine}>Date: {formatDate(quote.created_at)}</Text>
            {quote.expiry_date ? (
              <Text style={styles.metaLine}>Valid until: {formatDate(quote.expiry_date)}</Text>
            ) : null}
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{quote.status}</Text>
          </View>
        </View>

        <View style={styles.customerBlock}>
          <Text style={styles.customerLabel}>Prepared for</Text>
          <Text style={styles.customerName}>{customer?.name ?? "Customer"}</Text>
          {property?.address ? <Text style={styles.customerLine}>{property.address}</Text> : null}
          {customer?.phone ? <Text style={styles.customerLine}>{customer.phone}</Text> : null}
          {customer?.email ? <Text style={styles.customerLine}>{customer.email}</Text> : null}
        </View>

        {settings.quote_header ? <Text style={styles.introText}>{settings.quote_header}</Text> : null}

        {labourLines.length > 0 ? (
          <View style={styles.tableSection}>
            <Text style={styles.tableSectionTitle}>Labour</Text>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.colDescription, ...styles.tableHeaderCell }}>Description</Text>
              <Text style={{ ...styles.colQty, ...styles.tableHeaderCell }}>Hours</Text>
              <Text style={{ ...styles.colRate, ...styles.tableHeaderCell }}>Rate</Text>
              <Text style={{ ...styles.colTotal, ...styles.tableHeaderCell }}>Amount</Text>
            </View>
            {labourLines.map((line, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.colDescription, ...styles.tableCell }}>
                  {[line.labour_rate_types?.name, line.description].filter(Boolean).join(" — ")}
                </Text>
                <Text style={{ ...styles.colQty, ...styles.tableCell }}>{line.hours}h</Text>
                <Text style={{ ...styles.colRate, ...styles.tableCell }}>
                  {money(line.rate_per_hour ?? 0)}
                </Text>
                <Text style={{ ...styles.colTotal, ...styles.tableCell }}>{money(line.line_total)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {materialLines.length > 0 ? (
          <View style={styles.tableSection}>
            <Text style={styles.tableSectionTitle}>Materials</Text>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.colDescription, ...styles.tableHeaderCell }}>Description</Text>
              <Text style={{ ...styles.colQty, ...styles.tableHeaderCell }}>Qty</Text>
              <Text style={{ ...styles.colRate, ...styles.tableHeaderCell }}>Unit price</Text>
              <Text style={{ ...styles.colTotal, ...styles.tableHeaderCell }}>Amount</Text>
            </View>
            {materialLines.map((line, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
              >
                <Text style={{ ...styles.colDescription, ...styles.tableCell }}>
                  {line.description ?? ""}
                </Text>
                <Text style={{ ...styles.colQty, ...styles.tableCell }}>{line.quantity ?? 1}</Text>
                <Text style={{ ...styles.colRate, ...styles.tableCell }}>
                  {money(line.sell_price ?? 0)}
                </Text>
                <Text style={{ ...styles.colTotal, ...styles.tableCell }}>{money(line.line_total)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{money(quote.subtotal)}</Text>
          </View>
          {quote.gst_applied ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>GST (10%)</Text>
              <Text style={styles.totalsValue}>{money(quote.gst_amount)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotalBox}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{money(quote.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [quoteRes, linesRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, status, expiry_date, subtotal, gst_amount, total, gst_applied, created_at, jobs(properties(address, customers(name, email, phone)))",
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
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, quote_header",
      )
      .eq("id", true)
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (quoteRes.error || !quoteRes.data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const pdfSettings: BusinessSettingsPdf = settingsRes.data ?? {
    trading_name: null,
    abn: null,
    license_number: null,
    logo_url: null,
    logo_dark_url: null,
    primary_color: "#f59e0b",
    secondary_color: "#0a0a0a",
    accent_color: "#3b82f6",
    company_font: "Helvetica",
    quote_header: null,
  };

  const buffer = await renderToBuffer(
    <QuoteDocument quote={quoteRes.data} lines={linesRes.data ?? []} settings={pdfSettings} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${id.slice(0, 8)}.pdf"`,
    },
  });
}
