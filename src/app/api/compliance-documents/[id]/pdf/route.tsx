import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  ComplianceDocumentDocument,
  DEFAULT_PDF_SETTINGS,
  type CompliancePdfData,
  type BusinessSettingsPdf,
} from "@/lib/compliance-pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [documentRes, settingsRes] = await Promise.all([
    supabase
      .from("compliance_documents")
      .select(
        "id, status, field_values, external_reference, issued_date, created_at, compliance_document_templates(name, category, field_schema), jobs(properties(address, customers(name, email, phone)))",
      )
      .eq("id", id)
      .single()
      .returns<CompliancePdfData>(),
    supabase
      .from("business_settings")
      .select(
        "trading_name, abn, license_number, logo_url, logo_dark_url, primary_color, secondary_color, accent_color, company_font",
      )
      .single()
      .returns<BusinessSettingsPdf>(),
  ]);

  if (documentRes.error || !documentRes.data) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const pdfSettings: BusinessSettingsPdf = settingsRes.data ?? DEFAULT_PDF_SETTINGS;

  const buffer = await renderToBuffer(
    <ComplianceDocumentDocument document={documentRes.data} settings={pdfSettings} />,
  );

  const filename = documentRes.data.compliance_document_templates?.name ?? "document";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
