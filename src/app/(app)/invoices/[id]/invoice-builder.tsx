"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, Trash2 } from "lucide-react";
import {
  updateInvoice,
  updateInvoiceStatus,
  recordPayment,
  deletePayment,
} from "../actions";
import { ShareInvoiceDialog } from "./share-invoice-dialog";
import { InvoiceRecordStatusBadge } from "@/components/ui/status-badge";
import { NumericInput } from "@/components/ui/numeric-input";
import { PAYMENT_TERMS_OPTIONS, dueDateFromTerms } from "@/lib/payment-terms";
import { formatDate } from "@/lib/format";
import type { InvoiceDetailData, PaymentData } from "./page";
import type { InvoiceRecordStatus, InvoiceAmountType, PaymentTerms } from "@/types/database";

// Paid/Partially Paid are derived live from payments (see
// MANUALLY_SETTABLE_STATUSES in invoices/actions.ts) -- not offered here.
const INVOICE_STATUSES: InvoiceRecordStatus[] = ["Draft", "Sent", "Overdue", "Void", "Written Off"];
const DERIVED_STATUSES = new Set<InvoiceRecordStatus>(["Paid", "Partially Paid"]);

// payments.method stays a plain text column (existing free-text historical
// rows are untouched) -- this just constrains what new entries submit,
// picking from consistent values for reporting later, with "Other" as an
// escape hatch for anything unlisted.
const PAYMENT_METHOD_OPTIONS = ["Bank Transfer", "Cash", "Card", "Other"] as const;
type PaymentMethodOption = (typeof PAYMENT_METHOD_OPTIONS)[number];

// Same rounded-pill treatment as the status badges elsewhere -- method
// isn't a real status, but a quick colour-coded glance at how each payment
// came in is just as useful here. Falls back to the neutral style for any
// pre-existing free-text value that predates PAYMENT_METHOD_OPTIONS.
const PAYMENT_METHOD_STYLES: Record<string, string> = {
  "Bank Transfer": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Cash: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Card: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  Other: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

function PaymentMethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        PAYMENT_METHOD_STYLES[method] ?? PAYMENT_METHOD_STYLES.Other
      }`}
    >
      {method}
    </span>
  );
}

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function InvoiceBuilder({
  invoice,
  payments,
  today,
  tradingName,
  customerName,
}: {
  invoice: InvoiceDetailData;
  payments: PaymentData[];
  today: string;
  tradingName: string;
  customerName: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(invoice.status);
  // Paid/Partially Paid can change underneath this component purely from
  // payment records changing (the DB trigger derives them, no direct set
  // here) -- resync local state whenever a fresh invoice.status arrives via
  // router.refresh(), same pattern as JobsList syncing to a new prop.
  const [syncedStatus, setSyncedStatus] = useState(invoice.status);
  if (invoice.status !== syncedStatus) {
    setSyncedStatus(invoice.status);
    setStatus(invoice.status);
  }
  const [statusError, setStatusError] = useState<string | null>(null);
  const [amountType, setAmountType] = useState<InvoiceAmountType>(invoice.amount_type);
  const [percentage, setPercentage] = useState(invoice.percentage ?? 0);
  const [amount, setAmount] = useState(invoice.amount);
  const [issueDate, setIssueDate] = useState(invoice.issue_date);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(invoice.payment_terms);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>("Bank Transfer");
  const [otherMethod, setOtherMethod] = useState("");
  const [sharing, setSharing] = useState(false);

  const paidToDate = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = invoice.amount - paidToDate;

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Status</label>
            {DERIVED_STATUSES.has(status) ? (
              <div className="flex h-[38px] items-center gap-1.5">
                <InvoiceRecordStatusBadge status={status} />
                <span className="text-xs text-neutral-400">from payments</span>
              </div>
            ) : (
              <select
                value={status}
                onChange={(e) => {
                  const value = e.target.value as InvoiceRecordStatus;
                  const previous = status;
                  setStatus(value);
                  setStatusError(null);
                  startTransition(async () => {
                    try {
                      await updateInvoiceStatus(invoice.id, invoice.job_id, value);
                      refresh();
                    } catch (err) {
                      setStatus(previous);
                      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
                    }
                  });
                }}
                className={inputClass}
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            {statusError ? <p className="text-xs text-red-600 dark:text-red-400">{statusError}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Due date</label>
            <p className="rounded-lg border border-transparent px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-50">
              {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>
      </section>

      {sharing ? (
        <ShareInvoiceDialog
          invoiceId={invoice.id}
          jobId={invoice.job_id}
          invoiceNumber={invoice.invoice_number}
          tradingName={tradingName}
          customerName={customerName}
          onClose={() => setSharing(false)}
          onShared={refresh}
        />
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Payments</h2>
        {payments.length === 0 ? (
          <p className="mb-3 text-sm text-neutral-500">No payments recorded yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {money(payment.amount)}
                    </p>
                    {payment.method ? <PaymentMethodBadge method={payment.method} /> : null}
                  </div>
                  <p className="truncate text-xs text-neutral-500">
                    {formatDate(payment.paid_date)}
                    {payment.notes ? ` · ${payment.notes}` : ""}
                  </p>
                </div>
                <button
                  onClick={() =>
                    startTransition(() =>
                      deletePayment(payment.id, invoice.id, invoice.job_id).then(refresh),
                    )
                  }
                  className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                  aria-label="Delete payment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mb-3 flex justify-between text-sm">
          <span className="text-neutral-500">Paid to date</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-50">{money(paidToDate)}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-neutral-500">Balance</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-50">{money(balance)}</span>
        </div>

        {addingPayment ? (
          <form
            action={async (formData) => {
              if (paymentMethod === "Other") {
                formData.set("method", otherMethod.trim() || "Other");
              }
              await recordPayment(invoice.id, invoice.job_id, formData);
              setAddingPayment(false);
              setPaymentMethod("Bank Transfer");
              setOtherMethod("");
              refresh();
            }}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-end sm:flex-wrap"
          >
            <div className="flex w-28 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={balance > 0 ? balance.toFixed(2) : undefined}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Date</label>
              <input name="paid_date" type="date" defaultValue={today} className={inputClass} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Method</label>
              <select
                name="method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodOption)}
                className={inputClass}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {paymentMethod === "Other" ? (
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">Specify method</label>
                <input
                  value={otherMethod}
                  onChange={(e) => setOtherMethod(e.target.value)}
                  placeholder="e.g. Cheque"
                  className={inputClass}
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Notes (optional)</label>
              <input name="notes" className={inputClass} />
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
                onClick={() => {
                  setAddingPayment(false);
                  setPaymentMethod("Bank Transfer");
                  setOtherMethod("");
                }}
                className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAddingPayment(true)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Record payment
            </button>
            {balance > 0 ? (
              <button
                onClick={() => {
                  // Skips the form entirely for the common case -- customer
                  // paid the whole thing, today, however they usually pay.
                  // Still just a manual record (no payment gateway wired
                  // up), one click instead of typing amount/date/method.
                  const formData = new FormData();
                  formData.set("amount", balance.toFixed(2));
                  formData.set("paid_date", today);
                  formData.set("method", "Bank Transfer");
                  startTransition(() => recordPayment(invoice.id, invoice.job_id, formData).then(refresh));
                }}
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Mark as fully paid
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Details</h2>
        <form
          action={async (formData) => {
            await updateInvoice(invoice.id, invoice.job_id, formData);
            refresh();
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Stage label (optional)</label>
            <input
              name="stage_label"
              defaultValue={invoice.stage_label ?? ""}
              placeholder="e.g. Deposit, Progress Payment 1, Final Payment"
              className={inputClass}
            />
          </div>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="amount_type"
                value="percentage"
                checked={amountType === "percentage"}
                onChange={() => setAmountType("percentage")}
              />
              Percentage
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="amount_type"
                value="fixed"
                checked={amountType === "fixed"}
                onChange={() => setAmountType("fixed")}
              />
              Fixed amount
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            {amountType === "percentage" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-500">Percentage</label>
                <NumericInput
                  name="percentage"
                  step={0.1}
                  min={0}
                  max={100}
                  value={percentage}
                  onChange={setPercentage}
                  className={inputClass}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500">Amount</label>
              <NumericInput
                name="amount"
                step={0.01}
                min={0}
                value={amount}
                onChange={setAmount}
                required
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            The amount is locked in independently — it never recalculates on its own later, even if
            job variations change.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500">Issue date</label>
              <input
                name="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500">Payment terms</label>
              <select
                name="payment_terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                className={inputClass}
              >
                {PAYMENT_TERMS_OPTIONS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            New due date: {formatDate(dueDateFromTerms(issueDate, paymentTerms))}
          </p>

          <button
            type="submit"
            className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Save changes
          </button>
        </form>
      </section>

      {/* Share/download last -- by the time you're done editing details is
          the point you actually want to send the thing, not before. */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setSharing(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Share2 className="h-4 w-4" /> Share Invoice
          </button>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      </section>
    </div>
  );
}
