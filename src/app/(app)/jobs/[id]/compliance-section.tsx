"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Plus, Trash2, FileCheck2, Grid3x3, Lock, History } from "lucide-react";
import { clsx } from "clsx";
import {
  createTestRecord,
  deleteTestRecord,
  amendTestRecord,
  updateJobComplianceStatus,
} from "../actions";
import { createComplianceDocument } from "@/app/(app)/compliance-documents/actions";
import { TestResultBadge, ComplianceDocumentStatusBadge } from "@/components/ui/status-badge";
import { TestSheet } from "./test-sheet";
import { formatDate } from "@/lib/format";
import type {
  TestResult,
  CertificateStatus,
  NoticeStatus,
  ComplianceDocumentStatus,
} from "@/types/database";

export interface JobComplianceStatusData {
  requires_testing: boolean;
  requires_certificate: boolean;
  certificate_status: CertificateStatus;
  requires_notice: boolean;
  notice_status: NoticeStatus;
}

export interface TestTypeOption {
  id: string;
  name: string;
  default_unit: string | null;
  is_custom: boolean;
}

export interface CircuitOption {
  id: string;
  switchboard_ref: string | null;
  circuit_number: string;
  description: string;
  rcd_protected: boolean;
  rcd_ref: string | null;
}

export interface TestRecordData {
  id: string;
  circuit_id: string | null;
  circuit_or_equipment: string;
  test_type_id: string;
  custom_test_type_label: string | null;
  measured_value: number | null;
  unit: string | null;
  result: TestResult;
  instrument_used: string | null;
  tested_at: string;
  notes: string | null;
  is_superseded: boolean;
  supersedes_id: string | null;
  amended_reason: string | null;
  test_types: { name: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

export interface ComplianceTemplateOption {
  id: string;
  name: string;
  category: string;
}

export interface ComplianceDocumentListItem {
  id: string;
  status: ComplianceDocumentStatus;
  issued_date: string | null;
  created_at: string;
  compliance_document_templates: { name: string; category: string } | null;
}

const CERTIFICATE_STATUSES: CertificateStatus[] = ["Not Required", "Required", "Pending", "Issued"];
const NOTICE_STATUSES: NoticeStatus[] = ["Not Required", "Required", "Lodged"];
const TEST_RESULTS: TestResult[] = ["Pass", "Fail", "N/A"];

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function ComplianceSection({
  jobId,
  propertyId,
  testingCompleted,
  complianceComplete,
  jobComplianceStatus,
  testRecords,
  testTypes,
  circuits,
  currentUserId,
  canAmend,
  workers,
  complianceDocuments,
  complianceTemplates,
}: {
  jobId: string;
  propertyId: string;
  testingCompleted: boolean;
  complianceComplete: boolean;
  jobComplianceStatus: JobComplianceStatusData | null;
  testRecords: TestRecordData[];
  testTypes: TestTypeOption[];
  circuits: CircuitOption[];
  currentUserId: string;
  canAmend: boolean;
  workers: { id: string; full_name: string | null; email: string | null }[];
  complianceDocuments: ComplianceDocumentListItem[];
  complianceTemplates: ComplianceTemplateOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addingTest, setAddingTest] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<string>(testTypes[0]?.id ?? "");
  const [addingDocument, setAddingDocument] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [amendingId, setAmendingId] = useState<string | null>(null);

  const isLocked = jobComplianceStatus?.certificate_status === "Issued";

  function refresh() {
    router.refresh();
  }

  const status = jobComplianceStatus ?? {
    requires_testing: false,
    requires_certificate: false,
    certificate_status: "Not Required" as CertificateStatus,
    requires_notice: false,
    notice_status: "Not Required" as NoticeStatus,
  };

  const selectedType = testTypes.find((t) => t.id === selectedTestType);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Compliance status</h2>
          <span
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              complianceComplete
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
            )}
          >
            {complianceComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {complianceComplete ? "Complete" : "Incomplete"}
          </span>
        </div>

        <form
          key={JSON.stringify(status)}
          action={(formData) => {
            startTransition(() => updateJobComplianceStatus(jobId, formData).then(refresh));
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Testing required</p>
              <p className="text-xs text-neutral-500">
                {testingCompleted ? "Test records recorded for this job" : "No test records recorded yet"}
              </p>
            </div>
            <input
              type="checkbox"
              name="requires_testing"
              defaultChecked={status.requires_testing}
              className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Certificate required</p>
              <input
                type="checkbox"
                name="requires_certificate"
                defaultChecked={status.requires_certificate}
                className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700"
              />
            </div>
            <select name="certificate_status" defaultValue={status.certificate_status} className={inputClass}>
              {CERTIFICATE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Notice required</p>
              <input
                type="checkbox"
                name="requires_notice"
                defaultChecked={status.requires_notice}
                className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 dark:border-neutral-700"
              />
            </div>
            <select name="notice_status" defaultValue={status.notice_status} className={inputClass}>
              {NOTICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Save
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Test records</h2>
          <div className="flex items-center gap-3">
            {!addingTest ? (
              <button
                onClick={() => setAddingTest(true)}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add test record
              </button>
            ) : null}
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <Grid3x3 className="h-3.5 w-3.5" /> Test sheet
            </button>
          </div>
        </div>

        {isLocked ? (
          <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <Lock className="h-3.5 w-3.5 shrink-0" /> The certificate for this job has been issued
            -- existing test records are locked. Use Amend to correct one.
          </p>
        ) : null}

        {testRecords.length === 0 && !addingTest ? (
          <p className="text-sm text-neutral-500">No test records for this job yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {testRecords.map((record) =>
              amendingId === record.id ? (
                <AmendForm
                  key={record.id}
                  record={record}
                  jobId={jobId}
                  onDone={() => {
                    setAmendingId(null);
                    refresh();
                  }}
                />
              ) : (
                <li
                  key={record.id}
                  className={clsx(
                    "flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0",
                    record.is_superseded && "opacity-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {record.circuit_or_equipment}
                      {record.is_superseded ? (
                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                          Amended
                        </span>
                      ) : null}
                      {record.supersedes_id ? (
                        <span
                          className="flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                          title={record.amended_reason ?? undefined}
                        >
                          <History className="h-2.5 w-2.5" /> Amendment
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {record.custom_test_type_label || record.test_types?.name}
                      {record.measured_value != null ? ` · ${record.measured_value}${record.unit ?? ""}` : ""}
                      {record.profiles ? ` · ${record.profiles.full_name || record.profiles.email}` : ""}
                      {" · "}
                      {formatDate(record.tested_at)}
                    </p>
                  </div>
                  <TestResultBadge result={record.result} />
                  {isLocked && !record.is_superseded ? (
                    canAmend ? (
                      <button
                        onClick={() => setAmendingId(record.id)}
                        className="text-xs font-medium text-amber-600 hover:underline"
                      >
                        Amend
                      </button>
                    ) : null
                  ) : !record.is_superseded ? (
                    <button
                      onClick={() => startTransition(() => deleteTestRecord(record.id, jobId).then(refresh))}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label="Delete test record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}

        {addingTest ? (
          <form
            action={(formData) => {
              startTransition(() =>
                createTestRecord(jobId, formData).then(() => {
                  setAddingTest(false);
                  refresh();
                }),
              );
            }}
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <input
              type="text"
              name="circuit_or_equipment"
              placeholder="Circuit or equipment (e.g. Circuit 4 — Kitchen GPOs)"
              required
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                name="test_type_id"
                value={selectedTestType}
                onChange={(e) => setSelectedTestType(e.target.value)}
                className={inputClass}
              >
                {testTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select name="result" defaultValue="Pass" className={inputClass}>
                {TEST_RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {selectedType?.is_custom ? (
              <input
                type="text"
                name="custom_test_type_label"
                placeholder="Custom test type name"
                required
                className={inputClass}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                name="measured_value"
                placeholder="Measured value"
                className={inputClass}
              />
              <input
                type="text"
                name="unit"
                placeholder="Unit"
                defaultValue={selectedType?.default_unit ?? ""}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" name="instrument_used" placeholder="Instrument used" className={inputClass} />
              <select name="tested_by" defaultValue="" className={inputClass}>
                <option value="">Tested by…</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name || w.email}
                  </option>
                ))}
              </select>
            </div>
            <textarea name="notes" placeholder="Notes (optional)" rows={2} className={inputClass} />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingTest(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Compliance documents</h2>
          {!addingDocument ? (
            <button
              onClick={() => setAddingDocument(true)}
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> New document
            </button>
          ) : null}
        </div>

        {complianceDocuments.length === 0 && !addingDocument ? (
          <p className="text-sm text-neutral-500">No compliance documents for this job yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {complianceDocuments.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/compliance-documents/${doc.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <FileCheck2 className="h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {doc.compliance_document_templates?.name ?? "Document"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {doc.issued_date ? `Issued ${formatDate(doc.issued_date)}` : formatDate(doc.created_at)}
                    </p>
                  </div>
                  <ComplianceDocumentStatusBadge status={doc.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {addingDocument ? (
          <form
            action={(formData) => {
              const templateId = formData.get("template_id") as string;
              startTransition(() =>
                createComplianceDocument(jobId, propertyId, templateId).then(({ id }) => {
                  router.push(`/compliance-documents/${id}`);
                }),
              );
            }}
            className="flex items-center gap-2"
          >
            <select name="template_id" defaultValue="" required className={clsx(inputClass, "flex-1")}>
              <option value="" disabled>
                Select a template…
              </option>
              {complianceTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setAddingDocument(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </form>
        ) : null}
      </section>

      {showSheet ? (
        <TestSheet
          jobId={jobId}
          circuits={circuits}
          testTypes={testTypes}
          workers={workers}
          currentUserId={currentUserId}
          onClose={() => setShowSheet(false)}
          onSaved={() => {
            setShowSheet(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AmendForm({
  record,
  jobId,
  onDone,
}: {
  record: TestRecordData;
  jobId: string;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="flex flex-col gap-2 border-b border-neutral-100 py-2.5 last:border-b-0 dark:border-neutral-800">
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
        Amend: {record.circuit_or_equipment} — {record.custom_test_type_label || record.test_types?.name}
      </p>
      <form
        action={async (formData) => {
          setPending(true);
          setError(null);
          try {
            await amendTestRecord(record.id, jobId, formData);
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to amend.");
            setPending(false);
          }
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            name="measured_value"
            placeholder="Corrected measured value"
            defaultValue={record.measured_value ?? ""}
            className={inputClass}
          />
          <select name="result" defaultValue={record.result} className={inputClass}>
            {TEST_RESULTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <textarea
          name="notes"
          placeholder="Notes (optional)"
          rows={2}
          defaultValue={record.notes ?? ""}
          className={inputClass}
        />
        <input
          name="amended_reason"
          required
          placeholder="Reason for this amendment (required, kept on the audit trail)"
          className={inputClass}
        />
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        <div className="flex gap-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save amendment"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
