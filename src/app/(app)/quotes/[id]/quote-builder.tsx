"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import {
  updateQuoteStatus,
  updateQuoteExpiry,
  addLabourLine,
  addMaterialLine,
  updateLabourLine,
  updateMaterialLine,
  deleteLine,
} from "../actions";
import type { QuoteDetailData, QuoteLineItemData, ActiveLabourRateType } from "./page";
import type { QuoteStatus } from "@/types/database";

const QUOTE_STATUSES: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Rejected"];

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function QuoteBuilder({
  quote,
  lineItems,
  activeRateTypes,
  defaultMarkupPercent,
}: {
  quote: QuoteDetailData;
  lineItems: QuoteLineItemData[];
  activeRateTypes: ActiveLabourRateType[];
  defaultMarkupPercent: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expiry, setExpiry] = useState(quote.expiry_date ?? "");
  const [addingLabour, setAddingLabour] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const labourLines = lineItems.filter((l) => l.line_type === "labour");
  const materialLines = lineItems.filter((l) => l.line_type === "material");

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Status</label>
            <select
              value={quote.status}
              onChange={(e) => {
                const value = e.target.value as QuoteStatus;
                startTransition(() =>
                  updateQuoteStatus(quote.id, quote.job_id, value).then(refresh),
                );
              }}
              className={inputClass}
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Expiry date (optional)</label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => {
                const value = e.target.value;
                setExpiry(value);
                startTransition(() =>
                  updateQuoteExpiry(quote.id, quote.job_id, value || null).then(refresh),
                );
              }}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col justify-end">
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        </div>

        {quote.status !== "Draft" ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This quote has been {quote.status.toLowerCase()}. It&apos;s still editable, but the
            customer&apos;s copy won&apos;t reflect changes unless you re-download and re-send the
            PDF.
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Labour
        </h2>
        {labourLines.length === 0 ? (
          <p className="text-sm text-neutral-500">No labour lines yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {labourLines.map((line) =>
              editingLineId === line.id ? (
                <LabourLineEditRow
                  key={line.id}
                  line={line}
                  quoteId={quote.id}
                  jobId={quote.job_id}
                  onDone={() => setEditingLineId(null)}
                />
              ) : (
                <LineRow
                  key={line.id}
                  title={line.labour_rate_types?.name ?? "Labour"}
                  subtitle={`${line.hours}h × $${line.rate_per_hour?.toFixed(2)}/hr${
                    line.description ? ` · ${line.description}` : ""
                  }`}
                  total={line.line_total}
                  onEdit={() => setEditingLineId(line.id)}
                  onDelete={() =>
                    startTransition(() => deleteLine(line.id, quote.id, quote.job_id).then(refresh))
                  }
                />
              ),
            )}
          </ul>
        )}

        {addingLabour ? (
          <form
            action={async (formData) => {
              await addLabourLine(quote.id, quote.job_id, formData);
              setAddingLabour(false);
              refresh();
            }}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Rate type</label>
              <select name="labour_rate_type_id" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select...
                </option>
                {activeRateTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} (${rt.rate_per_hour.toFixed(2)}/hr)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-24 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Hours</label>
              <input name="hours" type="number" step="0.25" min="0" required className={inputClass} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Description (optional)</label>
              <input name="description" className={inputClass} />
            </div>
            <div className="flex gap-1">
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingLabour(false)}
                className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingLabour(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add labour line
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Materials
        </h2>
        {materialLines.length === 0 ? (
          <p className="text-sm text-neutral-500">No material lines yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {materialLines.map((line) =>
              editingLineId === line.id ? (
                <MaterialLineEditRow
                  key={line.id}
                  line={line}
                  quoteId={quote.id}
                  jobId={quote.job_id}
                  onDone={() => setEditingLineId(null)}
                />
              ) : (
                <LineRow
                  key={line.id}
                  title={line.description ?? "Material"}
                  subtitle={`$${line.cost?.toFixed(2)} cost + ${line.markup_percent}% markup`}
                  total={line.line_total}
                  onEdit={() => setEditingLineId(line.id)}
                  onDelete={() =>
                    startTransition(() => deleteLine(line.id, quote.id, quote.job_id).then(refresh))
                  }
                />
              ),
            )}
          </ul>
        )}

        {addingMaterial ? (
          <form
            action={async (formData) => {
              await addMaterialLine(quote.id, quote.job_id, formData);
              setAddingMaterial(false);
              refresh();
            }}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Description</label>
              <input name="description" required className={inputClass} />
            </div>
            <div className="flex w-28 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Cost</label>
              <input name="cost" type="number" step="0.01" min="0" required className={inputClass} />
            </div>
            <div className="flex w-24 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Markup %</label>
              <input
                name="markup_percent"
                type="number"
                step="0.1"
                min="0"
                defaultValue={defaultMarkupPercent}
                required
                className={inputClass}
              />
            </div>
            <div className="flex gap-1">
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingMaterial(false)}
                className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingMaterial(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add material line
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span className="text-neutral-900 dark:text-neutral-50">{money(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">GST {quote.gst_applied ? "(10%)" : ""}</span>
            <span className="text-neutral-900 dark:text-neutral-50">
              {quote.gst_applied ? money(quote.gst_amount) : "Not applicable"}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1.5 text-base font-semibold dark:border-neutral-800">
            <span className="text-neutral-900 dark:text-neutral-50">Total</span>
            <span className="text-neutral-900 dark:text-neutral-50">{money(quote.total)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function LineRow({
  title,
  subtitle,
  total,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {title}
        </p>
        <p className="truncate text-xs text-neutral-500">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {money(total)}
        </span>
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label="Edit line"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
          aria-label="Delete line"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function LabourLineEditRow({
  line,
  quoteId,
  jobId,
  onDone,
}: {
  line: QuoteLineItemData;
  quoteId: string;
  jobId: string;
  onDone: () => void;
}) {
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <form
        action={async (formData) => {
          await updateLabourLine(line.id, quoteId, jobId, formData);
          onDone();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex w-24 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">$/hr</label>
          <input
            name="rate_per_hour"
            type="number"
            step="0.01"
            min="0"
            defaultValue={line.rate_per_hour ?? 0}
            required
            className={inputClass}
          />
        </div>
        <div className="flex w-24 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Hours</label>
          <input
            name="hours"
            type="number"
            step="0.25"
            min="0"
            defaultValue={line.hours ?? 0}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Description</label>
          <input name="description" defaultValue={line.description ?? ""} className={inputClass} />
        </div>
        <div className="flex gap-1">
          <button type="submit" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDone} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </li>
  );
}

function MaterialLineEditRow({
  line,
  quoteId,
  jobId,
  onDone,
}: {
  line: QuoteLineItemData;
  quoteId: string;
  jobId: string;
  onDone: () => void;
}) {
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <form
        action={async (formData) => {
          await updateMaterialLine(line.id, quoteId, jobId, formData);
          onDone();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Description</label>
          <input
            name="description"
            defaultValue={line.description ?? ""}
            required
            className={inputClass}
          />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Cost</label>
          <input
            name="cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={line.cost ?? 0}
            required
            className={inputClass}
          />
        </div>
        <div className="flex w-24 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Markup %</label>
          <input
            name="markup_percent"
            type="number"
            step="0.1"
            min="0"
            defaultValue={line.markup_percent ?? 0}
            required
            className={inputClass}
          />
        </div>
        <div className="flex gap-1">
          <button type="submit" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDone} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </li>
  );
}
