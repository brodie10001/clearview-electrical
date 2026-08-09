"use client";

import { useMemo, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  parseUploadedFile,
  saveImportMapping,
  commitSupplierImport,
  loadSupplierImportContext,
  type CommitImportResult,
} from "./actions";
import { mapImportRow, summarizeImport, type ImportMapping } from "@/lib/price-list-mapping";
import type { ParsedFile } from "@/lib/parse-price-list";
import type { SupplierImportTargetField } from "@/types/database";
import type { ImportSupplierOption, ExistingSupplierPriceRow } from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

const TARGET_FIELDS: { key: SupplierImportTargetField; label: string; required: boolean }[] = [
  { key: "supplier_sku", label: "Supplier SKU", required: true },
  { key: "material_name", label: "Material / product name", required: true },
  { key: "cost_price", label: "Cost price", required: true },
  { key: "unit", label: "Unit (each/m/box)", required: false },
  { key: "brand", label: "Brand", required: false },
  { key: "category", label: "Category", required: false },
];

const REQUIRED_FIELDS = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);

type Step = "select" | "mapping" | "summary" | "done";

export function ImportWizard({
  suppliers,
  initialSupplierId,
  savedMapping,
  existingPrices,
  defaultMarkupPercent,
}: {
  suppliers: ImportSupplierOption[];
  initialSupplierId: string | undefined;
  savedMapping: ImportMapping;
  existingPrices: ExistingSupplierPriceRow[];
  defaultMarkupPercent: number;
}) {
  const [step, setStep] = useState<Step>("select");
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? suppliers[0]?.id ?? "");
  const [mapping, setMapping] = useState<ImportMapping>(savedMapping);
  const [priceContext, setPriceContext] = useState<ExistingSupplierPriceRow[]>(existingPrices);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingBySku = useMemo(
    () =>
      new Map(
        priceContext.map((p) => [
          p.supplier_sku,
          {
            supplierSku: p.supplier_sku,
            catalogueProductId: p.catalogue_product_id,
            costPrice: p.cost_price,
          },
        ]),
      ),
    [priceContext],
  );

  const mappedRows = useMemo(
    () => (parsed ? parsed.rows.map((r) => mapImportRow(r, mapping)) : []),
    [parsed, mapping],
  );

  const summary = useMemo(() => summarizeImport(mappedRows, existingBySku), [mappedRows, existingBySku]);

  const mappingComplete = REQUIRED_FIELDS.every((f) => mapping[f]);

  async function handleSupplierChange(id: string) {
    setSupplierId(id);
    setError(null);
    const ctx = await loadSupplierImportContext(id);
    setMapping(ctx.savedMapping);
    setPriceContext(ctx.existingPrices);
  }

  async function handleUpload(formData: FormData) {
    setUploading(true);
    setError(null);
    try {
      const file = await parseUploadedFile(formData);
      setParsed(file);
      const complete = REQUIRED_FIELDS.every((f) => mapping[f] && file.headers.includes(mapping[f]!));
      setStep(complete ? "summary" : "mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveMapping() {
    if (!mappingComplete) return;
    setError(null);
    try {
      await saveImportMapping(supplierId, mapping);
      setStep("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save mapping");
    }
  }

  async function handleCommit() {
    if (!parsed) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await commitSupplierImport(supplierId, parsed.rows, mapping);
      setResult(res);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  }

  if (suppliers.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No active suppliers yet -- add one under Settings &rarr; Suppliers first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {step === "select" ? (
        <form
          action={(formData) => {
            formData.set("supplier_id", supplierId);
            handleUpload(formData);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Supplier
            </label>
            <select
              value={supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className={inputClass}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Price list (Excel or CSV)
            </label>
            <input
              name="file"
              type="file"
              required
              accept=".csv,.xlsx,.xls"
              className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 dark:text-neutral-400 dark:file:bg-neutral-800 dark:file:text-neutral-300"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="flex w-fit items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" /> {uploading ? "Reading file..." : "Upload"}
          </button>
        </form>
      ) : null}

      {step === "mapping" && parsed ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            We haven&apos;t seen a price list from this supplier before -- match each field to a
            column from your file. This mapping is saved so future imports skip straight to the
            summary.
          </p>
          <div className="flex flex-col gap-3">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  {field.label}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field.key]: e.target.value || undefined }))
                  }
                  className={inputClass}
                >
                  <option value="">-- Not in file --</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveMapping}
            disabled={!mappingComplete}
            className="w-fit rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
          >
            Save mapping &amp; continue
          </button>
        </div>
      ) : null}

      {step === "summary" && parsed ? (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setStep("mapping")}
            className="w-fit text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            Adjust column mapping
          </button>

          {parsed.truncated ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> File has more rows than can be
              processed at once -- only the first 5000 were read.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Total rows" value={summary.total} />
            <SummaryTile label="Existing (matched)" value={summary.matched} />
            <SummaryTile label="New products" value={summary.newProducts} />
            <SummaryTile label="Needs review" value={summary.needsReview} warn={summary.needsReview > 0} />
          </div>
          <p className="text-sm text-neutral-500">
            {summary.pricesChanged} matched product{summary.pricesChanged === 1 ? "" : "s"} will
            have a price change. New products are created using the {defaultMarkupPercent}%
            default markup and tagged for category review if needed -- existing quotes, invoices
            and jobs are never touched.
          </p>

          <button
            onClick={handleCommit}
            disabled={committing || summary.total === 0}
            className="w-fit rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {committing ? "Importing..." : `Commit import (${summary.matched + summary.newProducts} rows)`}
          </button>
        </div>
      ) : null}

      {step === "done" && result ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Import complete
          </p>
          <p className="text-sm text-neutral-500">
            {result.matched} price{result.matched === 1 ? "" : "s"} updated ·{" "}
            {result.created} new product{result.created === 1 ? "" : "s"} created ·{" "}
            {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <p
        className={
          warn
            ? "text-lg font-semibold text-amber-600 dark:text-amber-400"
            : "text-lg font-semibold text-neutral-900 dark:text-neutral-50"
        }
      >
        {value}
      </p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
