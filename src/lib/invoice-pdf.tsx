import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";
import { contrastText, tint } from "@/lib/pdf-colors";
import type { CompanyFont, InvoiceRecordStatus, PaymentTerms, QuoteLineType } from "@/types/database";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// Invoices store their own payment_terms (set at creation, possibly from
// business_settings.default_payment_terms but independent thereafter), so
// the due date is never shown bare -- it's paired with what the terms
// actually mean in plain language.
function paymentTermsLabel(terms: PaymentTerms): string {
  return terms === "Due on Receipt" ? "Due on Receipt" : `Payment due within ${terms}`;
}

export interface InvoicePdfData {
  id: string;
  invoice_number: string;
  stage_label: string | null;
  amount: number;
  issue_date: string;
  due_date: string;
  payment_terms: PaymentTerms;
  status: InvoiceRecordStatus;
  jobs: {
    id: string;
    properties: {
      address: string;
      customers: {
        name: string;
        email: string | null;
        phone: string | null;
        billing_address: string | null;
      } | null;
    } | null;
  } | null;
}

// A full-amount (non-staged) invoice reuses the accepted quote's own line
// items so the breakdown matches exactly what the customer already agreed
// to -- same shapes as the quote PDF's QuotePdfLine/QuotePdfServiceLine, so
// intentionally kept structurally identical rather than redefined.
export interface InvoicePdfQuoteLine {
  line_type: QuoteLineType;
  description: string | null;
  rate_per_hour: number | null;
  hours: number | null;
  quantity: number | null;
  sell_price: number | null;
  line_total: number;
  labour_rate_types: { name: string } | null;
}

export interface InvoicePdfQuoteServiceLine {
  customer_facing_description: string;
  quantity: number;
  unit_sell_price: number;
  line_total: number;
}

// The accepted quote's own totals/notes, needed to (a) show a subtotal/GST
// breakdown for a full-amount invoice and (b) show Scope of Work as context
// on a staged invoice, without re-deriving either from scratch.
export interface InvoicePdfQuoteContext {
  subtotal: number;
  gst_amount: number;
  gst_applied: boolean;
  notes: string | null;
}

export interface BusinessSettingsPdf {
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
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  bank_bsb: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  payment_instructions: string | null;
}

export const DEFAULT_PDF_SETTINGS: BusinessSettingsPdf = {
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
  business_email: null,
  business_phone: null,
  business_address: null,
  bank_bsb: null,
  bank_account_name: null,
  bank_account_number: null,
  payment_instructions: null,
};

function buildStyles(settings: BusinessSettingsPdf) {
  const headerTint = tint(settings.secondary_color, 0.96);
  const zebraTint = tint(settings.secondary_color, 0.97);
  const customerTint = tint(settings.primary_color, 0.94);
  const paymentTint = tint(settings.secondary_color, 0.97);

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

    addressRow: { flexDirection: "row", gap: 14, marginBottom: 20 },
    customerBlock: {
      flex: 1,
      backgroundColor: customerTint,
      borderLeftWidth: 3,
      borderLeftColor: settings.primary_color,
      padding: 12,
    },
    siteBlock: {
      flex: 1,
      backgroundColor: tint(settings.secondary_color, 0.98),
      borderLeftWidth: 3,
      borderLeftColor: tint(settings.secondary_color, 0.6),
      padding: 12,
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

    sectionLabel: {
      fontSize: 7.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: tint(settings.secondary_color, 0.4),
      marginBottom: 4,
    },
    scopeText: { fontSize: 9, lineHeight: 1.5, marginBottom: 18, color: settings.secondary_color },
    stageLine: { fontSize: 11, fontWeight: 700, color: settings.secondary_color, marginBottom: 20 },

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

    paymentBlock: {
      marginTop: 26,
      backgroundColor: paymentTint,
      padding: 12,
      borderRadius: 4,
    },
    paymentTitle: {
      fontSize: 8.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: tint(settings.secondary_color, 0.4),
      marginBottom: 6,
    },
    paymentLine: { fontSize: 9, color: settings.secondary_color, marginBottom: 2 },
    paymentInstructions: {
      fontSize: 8.5,
      lineHeight: 1.4,
      marginTop: 6,
      color: tint(settings.secondary_color, 0.3),
    },

    footerText: { fontSize: 8.5, lineHeight: 1.5, marginTop: 24, color: tint(settings.secondary_color, 0.3) },
  });
}

// Normalizes for a simple textual comparison -- this only decides whether
// to bother printing a second address block, not anything security/data
// sensitive, so a loose case/whitespace-insensitive match is sufficient.
function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function InvoiceDocument({
  invoice,
  quoteLines,
  quoteServiceLines,
  quoteContext,
  settings,
}: {
  invoice: InvoicePdfData;
  quoteLines?: InvoicePdfQuoteLine[];
  quoteServiceLines?: InvoicePdfQuoteServiceLine[];
  quoteContext?: InvoicePdfQuoteContext | null;
  settings: BusinessSettingsPdf;
}) {
  const property = invoice.jobs?.properties;
  const customer = property?.customers;
  // The PDF page background is white, so it needs the primary (navy) logo,
  // not logo_dark_url -- see the equivalent note in the quote PDF route.
  const logoUrl = settings.logo_url || settings.logo_dark_url;
  const styles = buildStyles(settings);

  const billingAddress = customer?.billing_address || property?.address || null;
  const showSiteAddress = Boolean(property?.address) && !sameAddress(billingAddress, property!.address);

  const hasPaymentDetails = Boolean(
    settings.bank_bsb || settings.bank_account_name || settings.bank_account_number || settings.payment_instructions,
  );

  const isStaged = Boolean(invoice.stage_label);
  const labourLines = (quoteLines ?? []).filter((l) => l.line_type === "labour");
  const materialLines = (quoteLines ?? []).filter((l) => l.line_type === "material");
  const serviceLines = quoteServiceLines ?? [];

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
            {settings.business_address ? (
              <Text style={styles.businessDetailLine}>{settings.business_address}</Text>
            ) : null}
            {settings.business_phone ? (
              <Text style={styles.businessDetailLine}>{settings.business_phone}</Text>
            ) : null}
            {settings.business_email ? (
              <Text style={styles.businessDetailLine}>{settings.business_email}</Text>
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
            <Text style={styles.metaLine}>{paymentTermsLabel(invoice.payment_terms)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={styles.customerBlock}>
            <Text style={styles.customerLabel}>Billed to</Text>
            <Text style={styles.customerName}>{customer?.name ?? "Customer"}</Text>
            {billingAddress ? <Text style={styles.customerLine}>{billingAddress}</Text> : null}
            {customer?.phone ? <Text style={styles.customerLine}>{customer.phone}</Text> : null}
            {customer?.email ? <Text style={styles.customerLine}>{customer.email}</Text> : null}
          </View>
          {showSiteAddress ? (
            <View style={styles.siteBlock}>
              <Text style={styles.customerLabel}>Job site</Text>
              <Text style={styles.customerLine}>{property!.address}</Text>
            </View>
          ) : null}
        </View>

        {isStaged ? (
          <>
            {quoteContext?.notes ? (
              <View>
                <Text style={styles.sectionLabel}>Scope of work</Text>
                <Text style={styles.scopeText}>{quoteContext.notes}</Text>
              </View>
            ) : null}
            <Text style={styles.stageLine}>{invoice.stage_label}</Text>
          </>
        ) : (
          <>
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

            {serviceLines.length > 0 ? (
              <View style={styles.tableSection}>
                <Text style={styles.tableSectionTitle}>Services</Text>
                <View style={styles.tableHeader}>
                  <Text style={{ ...styles.colDescription, ...styles.tableHeaderCell }}>Description</Text>
                  <Text style={{ ...styles.colQty, ...styles.tableHeaderCell }}>Qty</Text>
                  <Text style={{ ...styles.colRate, ...styles.tableHeaderCell }}>Unit price</Text>
                  <Text style={{ ...styles.colTotal, ...styles.tableHeaderCell }}>Amount</Text>
                </View>
                {serviceLines.map((line, i) => (
                  <View
                    key={i}
                    style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
                  >
                    <Text style={{ ...styles.colDescription, ...styles.tableCell }}>
                      {line.customer_facing_description}
                    </Text>
                    <Text style={{ ...styles.colQty, ...styles.tableCell }}>{line.quantity}</Text>
                    <Text style={{ ...styles.colRate, ...styles.tableCell }}>
                      {money(line.unit_sell_price)}
                    </Text>
                    <Text style={{ ...styles.colTotal, ...styles.tableCell }}>{money(line.line_total)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        <View style={styles.totalsBlock}>
          {!isStaged && quoteContext ? (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{money(quoteContext.subtotal)}</Text>
              </View>
              {quoteContext.gst_applied ? (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>GST (10%)</Text>
                  <Text style={styles.totalsValue}>{money(quoteContext.gst_amount)}</Text>
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.grandTotalBox}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{money(invoice.amount)}</Text>
          </View>
        </View>

        {hasPaymentDetails ? (
          <View style={styles.paymentBlock}>
            <Text style={styles.paymentTitle}>Payment details</Text>
            {settings.bank_account_name ? (
              <Text style={styles.paymentLine}>Account name: {settings.bank_account_name}</Text>
            ) : null}
            {settings.bank_bsb ? <Text style={styles.paymentLine}>BSB: {settings.bank_bsb}</Text> : null}
            {settings.bank_account_number ? (
              <Text style={styles.paymentLine}>Account number: {settings.bank_account_number}</Text>
            ) : null}
            {settings.payment_instructions ? (
              <Text style={styles.paymentInstructions}>{settings.payment_instructions}</Text>
            ) : null}
          </View>
        ) : null}

        {settings.invoice_footer ? <Text style={styles.footerText}>{settings.invoice_footer}</Text> : null}
      </Page>
    </Document>
  );
}
