"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import {
  updateComplianceDocumentFields,
  updateComplianceDocumentStatus,
  updateComplianceDocumentDetails,
} from "../actions";
import { formatDate } from "@/lib/format";
import type { ComplianceDocumentDetailData } from "./page";
import type { ComplianceDocumentStatus } from "@/types/database";

const STATUSES: ComplianceDocumentStatus[] = ["Draft", "Issued", "Lodged"];

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function ComplianceDocumentBuilder({ document }: { document: ComplianceDocumentDetailData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fieldSchema = document.compliance_document_templates?.field_schema ?? [];

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Status</label>
            <select
              value={document.status}
              onChange={(e) => {
                const value = e.target.value as ComplianceDocumentStatus;
                startTransition(() =>
                  updateComplianceDocumentStatus(document.id, document.job_id, value).then(refresh),
                );
              }}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <a
              href={`/api/compliance-documents/${document.id}/pdf`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Details</h2>
        {fieldSchema.length === 0 ? (
          <p className="text-sm text-neutral-500">This template has no fields configured.</p>
        ) : (
          <form
            action={(formData) => {
              startTransition(() =>
                updateComplianceDocumentFields(document.id, document.job_id, fieldSchema, formData).then(
                  refresh,
                ),
              );
            }}
            className="flex flex-col gap-4"
          >
            {fieldSchema.map((field) => {
              const currentValue = document.field_values[field.key];
              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-500">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.key}
                      defaultValue={typeof currentValue === "string" ? currentValue : ""}
                      required={field.required}
                      rows={3}
                      className={inputClass}
                    />
                  ) : field.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-50">
                      <input
                        type="checkbox"
                        name={field.key}
                        defaultChecked={Boolean(currentValue)}
                        className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700"
                      />
                      Yes
                    </label>
                  ) : field.type === "select" ? (
                    <select
                      name={field.key}
                      defaultValue={typeof currentValue === "string" ? currentValue : ""}
                      required={field.required}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                      name={field.key}
                      defaultValue={
                        typeof currentValue === "string" || typeof currentValue === "number"
                          ? currentValue
                          : ""
                      }
                      required={field.required}
                      className={inputClass}
                    />
                  )}
                </div>
              );
            })}
            <button
              type="submit"
              className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Save
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Lodgement record
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Manual record only — this app does not lodge documents with WA eNotice or any external
          system. Record the reference number here once you&apos;ve lodged it directly yourself.
        </p>
        <form
          action={(formData) => {
            startTransition(() =>
              updateComplianceDocumentDetails(document.id, document.job_id, formData).then(refresh),
            );
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">External reference</label>
            <input
              type="text"
              name="external_reference"
              defaultValue={document.external_reference ?? ""}
              placeholder="e.g. WA eNotice reference number"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500">Issued date</label>
            <input
              type="date"
              name="issued_date"
              defaultValue={document.issued_date ?? ""}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Save
          </button>
        </form>
        {document.issued_date ? (
          <p className="mt-2 text-xs text-neutral-500">Issued {formatDate(document.issued_date)}</p>
        ) : null}
      </section>
    </div>
  );
}
