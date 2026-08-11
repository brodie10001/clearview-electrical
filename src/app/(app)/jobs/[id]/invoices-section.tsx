"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Receipt, Wrench, LayoutList } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { NumericInput } from "@/components/ui/numeric-input";
import { InvoiceRecordStatusBadge } from "@/components/ui/status-badge";
import { createAdHocInvoice, createInvoicesFromTemplate } from "../../invoices/actions";
import { PAYMENT_TERMS_OPTIONS, dueDateFromTerms } from "@/lib/payment-terms";
import { formatDate } from "@/lib/format";
import type { InvoiceRecordStatus, InvoiceAmountType, PaymentTerms } from "@/types/database";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  stage_label: string | null;
  amount: number;
  status: InvoiceRecordStatus;
  due_date: string;
}

export interface TemplateOption {
  id: string;
  name: string;
}

export interface TemplateStageOption {
  id: string;
  template_id: string;
  label: string;
  percentage: number;
}

export function InvoicesSection({
  jobId,
  invoices,
  templates,
  templateStages,
  revisedContractValue,
  remainingToInvoice,
  defaultPaymentTerms,
  today,
}: {
  jobId: string;
  invoices: InvoiceListItem[];
  templates: TemplateOption[];
  templateStages: TemplateStageOption[];
  revisedContractValue: number;
  remainingToInvoice: number;
  defaultPaymentTerms: PaymentTerms;
  today: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {invoices.length === 0 ? (
        <p className="text-sm text-neutral-500">No invoices for this job yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              {/* The whole card -- amount, invoice number, due date, and
                  status -- is one Link, so tapping anywhere on it (not just
                  the text) opens the invoice. The border/hover treatment
                  makes that obvious rather than just true. */}
              <Link
                href={`/invoices/${invoice.id}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <Receipt className="h-4 w-4 shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    ${invoice.amount.toFixed(2)}
                    {invoice.stage_label ? ` — ${invoice.stage_label}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {invoice.invoice_number} · Due {formatDate(invoice.due_date)}
                  </p>
                </div>
                <InvoiceRecordStatusBadge status={invoice.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Plus className="h-4 w-4" /> New Invoice
      </button>

      {open ? (
        <NewInvoiceDialog
          jobId={jobId}
          templates={templates}
          templateStages={templateStages}
          revisedContractValue={revisedContractValue}
          remainingToInvoice={remainingToInvoice}
          defaultPaymentTerms={defaultPaymentTerms}
          today={today}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

type Mode = "choose" | "template" | "adhoc";

function NewInvoiceDialog({
  jobId,
  templates,
  templateStages,
  revisedContractValue,
  remainingToInvoice,
  defaultPaymentTerms,
  today,
  onClose,
}: {
  jobId: string;
  templates: TemplateOption[];
  templateStages: TemplateStageOption[];
  revisedContractValue: number;
  remainingToInvoice: number;
  defaultPaymentTerms: PaymentTerms;
  today: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("choose");

  return (
    <Dialog open onClose={onClose} title="New Invoice">
      {mode === "choose" ? (
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-xs text-neutral-500">
            Remaining available to invoice: ${remainingToInvoice.toFixed(2)} of ${revisedContractValue.toFixed(2)} revised
            contract value.
          </p>
          <button
            onClick={() => setMode("template")}
            disabled={templates.length === 0}
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3.5 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <LayoutList className="h-4 w-4 shrink-0 text-neutral-400" />
            <span>
              From payment schedule template
              {templates.length === 0 ? (
                <span className="block text-xs font-normal text-neutral-400">
                  No templates set up yet — manage these in Business Settings.
                </span>
              ) : null}
            </span>
          </button>
          <button
            onClick={() => setMode("adhoc")}
            className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3.5 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Wrench className="h-4 w-4 shrink-0 text-neutral-400" />
            Ad hoc invoice
          </button>
        </div>
      ) : null}

      {mode === "template" ? (
        <TemplateStep
          jobId={jobId}
          templates={templates}
          templateStages={templateStages}
          revisedContractValue={revisedContractValue}
          defaultPaymentTerms={defaultPaymentTerms}
          today={today}
          onBack={() => setMode("choose")}
          onDone={onClose}
        />
      ) : null}

      {mode === "adhoc" ? (
        <AdHocStep
          jobId={jobId}
          revisedContractValue={revisedContractValue}
          defaultPaymentTerms={defaultPaymentTerms}
          today={today}
          onBack={() => setMode("choose")}
          onDone={onClose}
        />
      ) : null}
    </Dialog>
  );
}

interface DraftStage {
  label: string;
  percentage: number;
}

function TemplateStep({
  jobId,
  templates,
  templateStages,
  revisedContractValue,
  defaultPaymentTerms,
  today,
  onBack,
  onDone,
}: {
  jobId: string;
  templates: TemplateOption[];
  templateStages: TemplateStageOption[];
  revisedContractValue: number;
  defaultPaymentTerms: PaymentTerms;
  today: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [stages, setStages] = useState<DraftStage[]>(() =>
    templateStages
      .filter((s) => s.template_id === templates[0]?.id)
      .map((s) => ({ label: s.label, percentage: s.percentage })),
  );
  const [issueDate, setIssueDate] = useState(today);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(defaultPaymentTerms);

  function selectTemplate(id: string) {
    setTemplateId(id);
    setStages(
      templateStages
        .filter((s) => s.template_id === id)
        .map((s) => ({ label: s.label, percentage: s.percentage })),
    );
  }

  const total = stages.reduce((sum, s) => sum + s.percentage, 0);

  return (
    <form
      action={async () => {
        const formData = new FormData();
        formData.set("stages", JSON.stringify(stages));
        formData.set("issue_date", issueDate);
        formData.set("payment_terms", paymentTerms);
        await createInvoicesFromTemplate(jobId, formData);
        onDone();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Template</label>
        <select
          value={templateId}
          onChange={(e) => selectTemplate(e.target.value)}
          className={inputClass}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Stage</label>
              <input
                value={stage.label}
                onChange={(e) =>
                  setStages((prev) =>
                    prev.map((s, si) => (si === i ? { ...s, label: e.target.value } : s)),
                  )
                }
                className={inputClass}
              />
            </div>
            <div className="flex w-20 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">%</label>
              <NumericInput
                step={0.1}
                min={0}
                max={100}
                value={stage.percentage}
                onChange={(value) =>
                  setStages((prev) =>
                    prev.map((s, si) => (si === i ? { ...s, percentage: value } : s)),
                  )
                }
                className={inputClass}
              />
            </div>
            <span className="w-24 shrink-0 pb-1.5 text-right text-sm text-neutral-500">
              ${((revisedContractValue * stage.percentage) / 100).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setStages((prev) => prev.filter((_, si) => si !== i))}
              className="pb-1.5 text-xs text-neutral-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <p className={`text-xs ${total === 100 ? "text-neutral-400" : "text-amber-600 dark:text-amber-400"}`}>
          Total {total}% of ${revisedContractValue.toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Issue date</label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Payment terms</label>
          <select
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
      <p className="text-xs text-neutral-500">Due {formatDate(dueDateFromTerms(issueDate, paymentTerms))}</p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={stages.length === 0}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Create {stages.length} invoice{stages.length === 1 ? "" : "s"}
        </button>
      </div>
    </form>
  );
}

function AdHocStep({
  jobId,
  revisedContractValue,
  defaultPaymentTerms,
  today,
  onBack,
  onDone,
}: {
  jobId: string;
  revisedContractValue: number;
  defaultPaymentTerms: PaymentTerms;
  today: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [amountType, setAmountType] = useState<InvoiceAmountType>("percentage");
  const [percentage, setPercentage] = useState(0);
  const [amount, setAmount] = useState(0);
  const [issueDate, setIssueDate] = useState(today);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(defaultPaymentTerms);

  const computedAmount =
    amountType === "percentage" ? (revisedContractValue * percentage) / 100 : amount;

  return (
    <form
      action={async (formData) => {
        await createAdHocInvoice(jobId, formData);
        onDone();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Stage label (optional)</label>
        <input name="stage_label" placeholder="e.g. Progress Payment 1" className={inputClass} />
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
          % of revised contract
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

      {amountType === "percentage" ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Percentage</label>
          <NumericInput
            name="percentage"
            step={0.1}
            min={0}
            max={100}
            value={percentage}
            onChange={setPercentage}
            required
            className={inputClass}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
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
      )}
      <p className="text-xs text-neutral-500">Amount: ${computedAmount.toFixed(2)}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Issue date</label>
          <input
            name="issue_date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
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
      <p className="text-xs text-neutral-500">Due {formatDate(dueDateFromTerms(issueDate, paymentTerms))}</p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Create invoice
        </button>
      </div>
    </form>
  );
}
