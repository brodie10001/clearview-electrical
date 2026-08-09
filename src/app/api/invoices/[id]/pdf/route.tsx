import { NextResponse } from "next/server";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { contrastText, tint } from "@/lib/pdf-colors";
import type { CompanyFont, InvoiceRecordStatus } from "@/types/database";

export const runtime = "nodejs";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

interface InvoicePdfData {
  id: string;
  invoice_number: string;
  stage_label: string | null;
  amount: number;
  issue_date: string;
  due_date: string;
  status: InvoiceRecordStatus;
  jobs: {
    properties: {
      address: string;
      customers: { name: string; email: string | null; phone: string | null } | null;
    } | null;
  } | null;
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
  invoice_footer: string | null;
}

function buildStyles(settings: BusinessSettingsPdf) {
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
    divider: { height: 2.5, backgroundColor: settings.primary_color, marginTop: 16, marginBottom: 22 },

    metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
    invoiceTitle: { fontSize: 22, fontWeight: 700, color: settings.secondary_color, marginBottom: 6 },
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

    stageLine: { fontSize: 11, fontWeight: 700, color: settings.secondary_color, marginBottom: 20 },
    footerText: { fontSize: 8.5, lineHeight: 1.5, marginTop: 24, color: tint(settings.secondary_color, 0.3) },

    totalsBlock: { marginTop: 8, alignItems: "flex-end" },
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

function InvoiceDocument({
  invoice,
  settings,
}: {
  invoice: InvoicePdfData;
  settings: BusinessSettingsPdf;
}) {
  const property = invoice.jobs?.properties;
  const customer = property?.customers;
  // The PDF page background is white, so it needs the primary (navy) logo,
  // not logo_dark_url -- see the equivalent note in the quote PDF route.
  const logoUrl = settings.logo_url || settings.logo_dark_url;
  const styles = buildStyles(settings);

  return (
    <Document>
      <Page size="A4" style={{ ...styles.page, fontFamily: settings.company_font }}>
        <View style={styles.headerRow}>
          {logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.wordmark}>{settings.trading_name || "Invoice"}</Text>
          )}
          <View style={styles.businessDetails}>
            {settings.abn ? <Text style={styles.businessDetailLine}>ABN {settings.abn}</Text> : null}
            {settings.license_number ? (
              <Text style={styles.businessDetailLine}>Lic. {settings.license_number}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.invoiceTitle}>Tax Invoice</Text>
            <Text style={styles.metaLine}>No. {invoice.invoice_number}</Text>
            <Text style={styles.metaLine}>Issued: {formatDate(invoice.issue_date)}</Text>
            <Text style={styles.metaLine}>Due: {formatDate(invoice.due_date)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.customerBlock}>
          <Text style={styles.customerLabel}>Billed to</Text>
          <Text style={styles.customerName}>{customer?.name ?? "Customer"}</Text>
          {property?.address ? <Text style={styles.customerLine}>{property.address}</Text> : null}
          {customer?.phone ? <Text style={styles.customerLine}>{customer.phone}</Text> : null}
          {customer?.email ? <Text style={styles.customerLine}>{customer.email}</Text> : null}
        </View>

        {invoice.stage_label ? <Text style={styles.stageLine}>{invoice.stage_label}</Text> : null}

        <View style={styles.totalsBlock}>
          <View style={styles.grandTotalBox}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{money(invoice.amount)}</Text>
          </View>
        </View>

        {settings.invoice_footer ? <Text style={styles.footerText}>{settings.invoice_footer}</Text> : null}
      </Page>
    </Document>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, stage_label, amount, issue_date, due_date, status, jobs(properties(address, customers(name, email, phone)))",
      )
      .eq("id", id)
      .single()
      .returns<InvoicePdfData>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font, invoice_footer",
      )
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
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
    invoice_footer: null,
  };

  const buffer = await renderToBuffer(<InvoiceDocument invoice={invoiceRes.data} settings={pdfSettings} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceRes.data.invoice_number}.pdf"`,
    },
  });
}
