"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { clsx } from "clsx";
import {
  createPaymentScheduleTemplate,
  renamePaymentScheduleTemplate,
  deletePaymentScheduleTemplate,
  addTemplateStage,
  updateTemplateStage,
  deleteTemplateStage,
} from "./actions";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export interface PaymentScheduleTemplateData {
  id: string;
  name: string;
}

export interface PaymentScheduleStageData {
  id: string;
  template_id: string;
  label: string;
  percentage: number;
  sort_order: number;
}

export function PaymentScheduleTemplatesSection({
  templates,
  stages,
  canEdit,
}: {
  templates: PaymentScheduleTemplateData[];
  stages: PaymentScheduleStageData[];
  canEdit: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [addingStageFor, setAddingStageFor] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const stagesByTemplate = useMemo(() => {
    const map = new Map<string, PaymentScheduleStageData[]>();
    for (const stage of stages) {
      const list = map.get(stage.template_id) ?? [];
      list.push(stage);
      map.set(stage.template_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [stages]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        Reusable payment schedules (e.g. &quot;30/40/30 Standard&quot;). Applying one to a job only
        pre-fills draft invoice stages — nothing here creates invoices directly.
      </p>

      <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {templates.map((template) => {
          const templateStages = stagesByTemplate.get(template.id) ?? [];
          const totalPercent = templateStages.reduce((sum, s) => sum + s.percentage, 0);
          const expanded = expandedId === template.id;

          return (
            <li key={template.id} className="flex flex-col">
              {renamingId === template.id ? (
                <form
                  action={async (formData) => {
                    await renamePaymentScheduleTemplate(template.id, formData);
                    setRenamingId(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5"
                >
                  <input name="name" defaultValue={template.name} required autoFocus className={inputClass} />
                  <button type="submit" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <button
                    onClick={() => setExpandedId(expanded ? null : template.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:opacity-80"
                  >
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    )}
                    <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {template.name}
                    </span>
                  </button>
                  <span
                    className={clsx(
                      "shrink-0 text-xs",
                      totalPercent === 100 ? "text-neutral-400" : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {templateStages.length} stage{templateStages.length === 1 ? "" : "s"} · {totalPercent}%
                  </span>
                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setRenamingId(template.id)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        aria-label="Rename template"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deletePaymentScheduleTemplate(template.id)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                        aria-label="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {expanded ? (
                <div className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                  {templateStages.length === 0 ? (
                    <p className="text-xs text-neutral-500">No stages yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                      {templateStages.map((stage) =>
                        editingStageId === stage.id ? (
                          <li key={stage.id} className="py-2 first:pt-0">
                            <form
                              action={async (formData) => {
                                await updateTemplateStage(stage.id, formData);
                                setEditingStageId(null);
                              }}
                              className="flex items-end gap-2"
                            >
                              <StageFields defaults={stage} />
                              <button type="submit" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
                                <Check className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setEditingStageId(null)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Cancel">
                                <X className="h-4 w-4" />
                              </button>
                            </form>
                          </li>
                        ) : (
                          <li key={stage.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                            <span className="text-sm text-neutral-900 dark:text-neutral-50">{stage.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">{stage.percentage}%</span>
                              {canEdit ? (
                                <>
                                  <button
                                    onClick={() => setEditingStageId(stage.id)}
                                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                    aria-label="Edit stage"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteTemplateStage(stage.id)}
                                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                                    aria-label="Delete stage"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </li>
                        ),
                      )}
                    </ul>
                  )}

                  {canEdit ? (
                    addingStageFor === template.id ? (
                      <form
                        action={async (formData) => {
                          await addTemplateStage(template.id, formData);
                          setAddingStageFor(null);
                        }}
                        className="flex items-end gap-2"
                      >
                        <StageFields />
                        <button type="submit" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save">
                          <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setAddingStageFor(null)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Cancel">
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingStageFor(template.id)}
                        className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add stage
                      </button>
                    )
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        addingTemplate ? (
          <form
            action={async (formData) => {
              await createPaymentScheduleTemplate(formData);
              setAddingTemplate(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <input
              name="name"
              required
              placeholder='e.g. "30/40/30 Standard"'
              autoFocus
              className={clsx(inputClass, "flex-1")}
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAddingTemplate(false)}
              className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingTemplate(true)}
            className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add template
          </button>
        )
      ) : null}
    </div>
  );
}

function StageFields({ defaults }: { defaults?: PaymentScheduleStageData }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Label</label>
        <input
          name="label"
          required
          defaultValue={defaults?.label ?? ""}
          placeholder="e.g. Deposit"
          className={inputClass}
        />
      </div>
      <div className="flex w-24 flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">%</label>
        <input
          name="percentage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          required
          defaultValue={defaults?.percentage ?? ""}
          className={inputClass}
        />
      </div>
    </>
  );
}
