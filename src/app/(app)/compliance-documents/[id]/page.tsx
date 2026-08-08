import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ComplianceDocumentBuilder } from "./compliance-document-builder";
import type { ComplianceDocumentStatus, ComplianceFieldDef } from "@/types/database";

export interface ComplianceDocumentDetailData {
  id: string;
  job_id: string;
  property_id: string;
  template_id: string;
  field_values: Record<string, unknown>;
  status: ComplianceDocumentStatus;
  external_reference: string | null;
  issued_date: string | null;
  created_at: string;
  compliance_document_templates: { name: string; category: string; field_schema: ComplianceFieldDef[] } | null;
  jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
}

export default async function ComplianceDocumentDetailPage({
  params,
}: PageProps<"/compliance-documents/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("compliance_documents")
    .select(
      "id, job_id, property_id, template_id, field_values, status, external_reference, issued_date, created_at, compliance_document_templates(name, category, field_schema), jobs(properties(address, customers(name)))",
    )
    .eq("id", id)
    .single()
    .returns<ComplianceDocumentDetailData>();

  if (!document) notFound();
  const property = document.jobs?.properties;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <Link
          href={`/jobs/${document.job_id}`}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
        >
          <MapPin className="h-3.5 w-3.5" />
          {property?.address ?? "Unknown property"}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          {document.compliance_document_templates?.name ?? "Compliance Document"}
        </h1>
        <p className="text-xs text-neutral-500">
          {property?.customers?.name ?? "Customer"} · Created {formatDate(document.created_at)}
        </p>
      </div>

      <ComplianceDocumentBuilder document={document} />
    </div>
  );
}
