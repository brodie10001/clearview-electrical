import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";
import { contrastText, tint } from "@/lib/pdf-colors";
import type { CompanyFont, ComplianceDocumentStatus, ComplianceFieldDef } from "@/types/database";

export interface CompliancePdfData {
  id: string;
  status: ComplianceDocumentStatus;
  field_values: Record<string, unknown>;
  external_reference: string | null;
  issued_date: string | null;
  created_at: string;
  compliance_document_templates: { name: string; category: string; field_schema: ComplianceFieldDef[] } | null;
  jobs: {
    properties: {
      address: string;
      customers: { name: string; email: string | null; phone: string | null } | null;
    } | null;
  } | null;
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
};

function buildStyles(settings: BusinessSettingsPdf) {
  const customerTint = tint(settings.primary_color, 0.94);
  const fieldTint = tint(settings.secondary_color, 0.97);

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
    docTitle: { fontSize: 20, fontWeight: 700, color: settings.secondary_color, marginBottom: 6 },
    docCategory: { fontSize: 9.5, color: tint(settings.secondary_color, 0.35), marginBottom: 6 },
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

    sectionLabel: {
      fontSize: 7.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: tint(settings.secondary_color, 0.4),
      marginBottom: 10,
      marginTop: 4,
    },
    fieldRow: {
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: "#ececec",
    },
    fieldRowAlt: { backgroundColor: fieldTint },
    fieldLabel: { flex: 2, fontSize: 9, color: tint(settings.secondary_color, 0.35) },
    fieldValue: { flex: 3, fontSize: 9, color: settings.secondary_color },

    referenceBlock: { marginTop: 24 },
    referenceLine: { fontSize: 8.5, color: tint(settings.secondary_color, 0.35), marginBottom: 3 },
  });
}

function formatFieldValue(field: ComplianceFieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "date") return formatDate(String(value));
  return String(value);
}

export function ComplianceDocumentDocument({
  document,
  settings,
}: {
  document: CompliancePdfData;
  settings: BusinessSettingsPdf;
}) {
  const property = document.jobs?.properties;
  const customer = property?.customers;
  const template = document.compliance_document_templates;
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
            <Text style={styles.wordmark}>{settings.trading_name || "Document"}</Text>
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
            <Text style={styles.docTitle}>{template?.name ?? "Compliance Document"}</Text>
            {template?.category ? <Text style={styles.docCategory}>{template.category}</Text> : null}
            <Text style={styles.metaLine}>Created: {formatDate(document.created_at)}</Text>
            {document.issued_date ? (
              <Text style={styles.metaLine}>Issued: {formatDate(document.issued_date)}</Text>
            ) : null}
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{document.status}</Text>
          </View>
        </View>

        <View style={styles.customerBlock}>
          <Text style={styles.customerLabel}>Property</Text>
          <Text style={styles.customerName}>{customer?.name ?? "Customer"}</Text>
          {property?.address ? <Text style={styles.customerLine}>{property.address}</Text> : null}
          {customer?.phone ? <Text style={styles.customerLine}>{customer.phone}</Text> : null}
          {customer?.email ? <Text style={styles.customerLine}>{customer.email}</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>Details</Text>
        {(template?.field_schema ?? []).map((field, i) => (
          <View key={field.key} style={i % 2 === 1 ? { ...styles.fieldRow, ...styles.fieldRowAlt } : styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>
              {formatFieldValue(field, document.field_values[field.key])}
            </Text>
          </View>
        ))}

        {document.external_reference ? (
          <View style={styles.referenceBlock}>
            <Text style={styles.referenceLine}>External reference: {document.external_reference}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
