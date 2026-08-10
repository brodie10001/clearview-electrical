"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Download,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  Share2,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";
import {
  updateQuoteExpiry,
  updateQuoteNotes,
  addLabourLine,
  updateLabourLine,
  updateMaterialLine,
  deleteLine,
  deleteServiceItemLine,
  createNewQuoteVersion,
  markQuoteAccepted,
  markQuoteDeclined,
} from "../actions";
import { AddMaterialDialog } from "./add-material-dialog";
import { AddPriceBookItemDialog } from "./add-price-book-item-dialog";
import { ShareQuoteDialog } from "./share-quote-dialog";
import { QuoteActivityTimeline, type QuoteActivityItem } from "./quote-activity-timeline";
import type {
  QuoteDetailData,
  QuoteLineItemData,
  QuoteServiceItemLineData,
  ActiveLabourRateType,
} from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function QuoteBuilder({
  quote,
  lineItems,
  serviceItemLines,
  activeRateTypes,
  defaultMarkupPercent,
  tradingName,
  customerName,
  activity,
}: {
  quote: QuoteDetailData;
  lineItems: QuoteLineItemData[];
  serviceItemLines: QuoteServiceItemLineData[];
  activeRateTypes: ActiveLabourRateType[];
  defaultMarkupPercent: number;
  tradingName: string;
  customerName: string;
  activity: QuoteActivityItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expiry, setExpiry] = useState(quote.expiry_date ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [addingLabour, setAddingLabour] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingServiceItem, setAddingServiceItem] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [declining, setDeclining] = useState(false);

  const locked = quote.status !== "Draft";
  const labourLines = lineItems.filter((l) => l.line_type === "labour");
  const materialLines = lineItems.filter((l) => l.line_type === "material");

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-2">
          <QuoteStatusPill status={quote.status} />
          {locked ? (
            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <Lock className="h-3 w-3" /> Locked — v{quote.version}
            </span>
          ) : null}
          <a
            href={`/api/quotes/${quote.id}/pdf`}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500">Expiry date (optional)</label>
          <input
            type="date"
            value={expiry}
            disabled={locked}
            onChange={(e) => {
              const value = e.target.value;
              setExpiry(value);
              startTransition(() => updateQuoteExpiry(quote.id, quote.job_id, value || null).then(refresh));
            }}
            className={`${inputClass} max-w-xs disabled:cursor-not-allowed disabled:opacity-60`}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!locked ? (
            <button
              onClick={() => setSharing(true)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              <Share2 className="h-4 w-4" /> Share Quote
            </button>
          ) : (
            <>
              <button
                onClick={() => setSharing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Share2 className="h-4 w-4" /> Share again
              </button>
              {quote.status === "Sent" ? (
                <>
                  <button
                    onClick={() =>
                      startTransition(() => markQuoteAccepted(quote.id, quote.job_id).then(refresh))
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark as Accepted
                  </button>
                  <button
                    onClick={() => setDeclining(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4" /> Mark as Declined
                  </button>
                </>
              ) : null}
              <button
                onClick={() =>
                  startTransition(() => createNewQuoteVersion(quote.id, quote.job_id).then(refresh))
                }
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <History className="h-4 w-4" /> Start new version
              </button>
            </>
          )}
        </div>

        {declining ? (
          <form
            action={async (formData) => {
              await markQuoteDeclined(quote.id, quote.job_id, formData);
              setDeclining(false);
              refresh();
            }}
            className="mt-3 flex flex-col gap-2 rounded-lg border border-red-200 p-3 dark:border-red-500/30"
          >
            <label className="text-xs font-medium text-neutral-500">Reason (optional)</label>
            <input name="note" placeholder="e.g. Went with another contractor" className={inputClass} />
            <div className="flex gap-1">
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Confirm Decline
              </button>
              <button
                type="button"
                onClick={() => setDeclining(false)}
                className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {locked ? (
          <p className="mt-4 text-xs text-neutral-500">
            This quote is locked — the customer&apos;s copy stays exactly as sent. Start a new version to
            make changes.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Scope of work
        </h2>
        {locked ? (
          <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {notes || "No scope of work added."}
          </p>
        ) : (
          <textarea
            value={notes}
            rows={3}
            placeholder="Describe the work covered by this quote..."
            onChange={(e) => setNotes(e.target.value)}
            onBlur={(e) => {
              const formData = new FormData();
              formData.set("notes", e.target.value);
              startTransition(() => updateQuoteNotes(quote.id, quote.job_id, formData).then(refresh));
            }}
            className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        )}
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
                  locked={locked}
                  onEdit={() => setEditingLineId(line.id)}
                  onDelete={() =>
                    startTransition(() => deleteLine(line.id, quote.id, quote.job_id).then(refresh))
                  }
                />
              ),
            )}
          </ul>
        )}

        {!locked ? (
          addingLabour ? (
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
          )
        ) : null}
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
                  subtitle={`${line.quantity ?? 1} × $${(line.sell_price ?? 0).toFixed(2)}`}
                  total={line.line_total}
                  locked={locked}
                  onEdit={() => setEditingLineId(line.id)}
                  onDelete={() =>
                    startTransition(() => deleteLine(line.id, quote.id, quote.job_id).then(refresh))
                  }
                />
              ),
            )}
          </ul>
        )}

        {!locked ? (
          <button
            onClick={() => setAddingMaterial(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add material
          </button>
        ) : null}

        {addingMaterial ? (
          <AddMaterialDialog
            onClose={() => setAddingMaterial(false)}
            quoteId={quote.id}
            jobId={quote.job_id}
            defaultMarkupPercent={defaultMarkupPercent}
            onAdded={refresh}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Price Book
        </h2>
        {serviceItemLines.length === 0 ? (
          <p className="text-sm text-neutral-500">No Price Book items yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {serviceItemLines.map((line) => (
              <LineRow
                key={line.id}
                title={line.customer_facing_description}
                subtitle={`${line.quantity} × ${money(line.unit_sell_price)}`}
                total={line.line_total}
                locked={locked}
                onDelete={() =>
                  startTransition(() =>
                    deleteServiceItemLine(line.id, quote.id, quote.job_id).then(refresh),
                  )
                }
              />
            ))}
          </ul>
        )}

        {!locked ? (
          <button
            onClick={() => setAddingServiceItem(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add Price Book item
          </button>
        ) : null}

        {addingServiceItem ? (
          <AddPriceBookItemDialog
            onClose={() => setAddingServiceItem(false)}
            quoteId={quote.id}
            jobId={quote.job_id}
            onAdded={refresh}
          />
        ) : null}
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

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Activity</h2>
        <QuoteActivityTimeline items={activity} />
      </section>

      {sharing ? (
        <ShareQuoteDialog
          quoteId={quote.id}
          jobId={quote.job_id}
          quoteNumber={quote.quote_number}
          tradingName={tradingName}
          customerName={customerName}
          onClose={() => setSharing(false)}
          onShared={refresh}
        />
      ) : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  Sent: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Accepted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function QuoteStatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
    >
      {status === "Rejected" ? "Declined" : status}
    </span>
  );
}

function LineRow({
  title,
  subtitle,
  total,
  locked,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  total: number;
  locked: boolean;
  onEdit?: () => void;
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
        {!locked ? (
          <>
            {onEdit ? (
              <button
                onClick={onEdit}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label="Edit line"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              onClick={onDelete}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
              aria-label="Delete line"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
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
        <div className="flex w-20 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Qty</label>
          <input
            name="quantity"
            type="number"
            step="1"
            min="1"
            defaultValue={line.quantity ?? 1}
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
