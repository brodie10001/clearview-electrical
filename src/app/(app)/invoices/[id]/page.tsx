import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayDateString } from "@/lib/format";
import { InvoiceBuilder } from "./invoice-builder";
import type { InvoiceAmountType, InvoiceRecordStatus, PaymentTerms } from "@/types/database";

export interface InvoiceDetailData {
  id: string;
  job_id: string;
  invoice_number: string;
  stage_label: string | null;
  amount_type: InvoiceAmountType;
  percentage: number | null;
  amount: number;
  issue_date: string;
  payment_terms: PaymentTerms;
  due_date: string;
  status: InvoiceRecordStatus;
  created_at: string;
  jobs: {
    id: string;
    properties: { address: string; customers: { name: string } | null } | null;
  } | null;
}

export interface PaymentData {
  id: string;
  amount: number;
  paid_date: string;
  method: string | null;
  notes: string | null;
}

export default async function InvoiceDetailPage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [invoiceRes, paymentsRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, job_id, invoice_number, stage_label, amount_type, percentage, amount, issue_date, payment_terms, due_date, status, created_at, jobs(id, properties(address, customers(name)))",
      )
      .eq("id", id)
      .single()
      .returns<InvoiceDetailData>(),
    supabase
      .from("payments")
      .select("id, amount, paid_date, method, notes")
      .eq("invoice_id", id)
      .order("paid_date", { ascending: false })
      .returns<PaymentData[]>(),
    supabase.from("business_settings").select("trading_name").maybeSingle(),
  ]);

  if (invoiceRes.error || !invoiceRes.data) notFound();
  const invoice = invoiceRes.data;
  const property = invoice.jobs?.properties;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <Link
          href={`/jobs/${invoice.job_id}`}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600"
        >
          <MapPin className="h-3.5 w-3.5" />
          {property?.address ?? "Unknown property"}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Invoice for {property?.customers?.name ?? "customer"}
        </h1>
        <p className="text-xs text-neutral-500">
          {invoice.invoice_number} · Created {formatDate(invoice.created_at)}
        </p>
      </div>

      <InvoiceBuilder
        invoice={invoice}
        payments={paymentsRes.data ?? []}
        today={todayDateString()}
        tradingName={settingsRes.data?.trading_name || "your electrician"}
        customerName={property?.customers?.name ?? "Customer"}
      />
    </div>
  );
}
