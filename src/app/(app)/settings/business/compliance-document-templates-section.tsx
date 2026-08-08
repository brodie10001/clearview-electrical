"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createComplianceDocumentTemplate,
  updateComplianceDocumentTemplate,
  toggleComplianceDocumentTemplateActive,
} from "./actions";
import type { ComplianceDocumentTemplateSettingsData } from "./page";
import type { ComplianceFieldDef, ComplianceFieldType } from "@/types/database";

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

const FIELD_TYPES: ComplianceFieldType[] = ["text", "textarea", "number", "date", "checkbox", "select"];

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function FieldEditor({
  fields,
  onChange,
}: {
  fields: ComplianceFieldDef[];
  onChange: (fields: ComplianceFieldDef[]) => void;
}) {
  function updateField(index: number, patch: Partial<ComplianceFieldDef>) {
    const next = [...fields];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function addField() {
    onChange([...fields, { key: `field_${fields.length + 1}`, label: "", type: "text", required: false }]);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500">Fields</p>
      {fields.map((field, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-700 sm:flex-row sm:items-center"
        >
          <input
            value={field.label}
            onChange={(e) =>
              updateField(i, { label: e.target.value, key: field.key || slugify(e.target.value) })
            }
            onBlur={(e) => {
              if (!field.key) updateField(i, { key: slugify(e.target.value) });
            }}
            placeholder="Field label"
            className={inputClass}
          />
          <select
            value={field.type}
            onChange={(e) => updateField(i, { type: e.target.value as ComplianceFieldType })}
            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {field.type === "select" ? (
            <input
              value={(field.options ?? []).join(", ")}
              onChange={(e) =>
                updateField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })
              }
              placeholder="Options (comma-separated)"
              className={inputClass}
            />
          ) : null}
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(i, { required: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-neutral-300"
            />
            Required
          </label>
          <button
            type="button"
            onClick={() => removeField(i)}
            className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            aria-label="Remove field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Plus className="h-3.5 w-3.5" /> Add field
      </button>
    </div>
  );
}

function TemplateForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; category: string; field_schema: ComplianceFieldDef[] };
  onSubmit: (name: string, category: string, fieldSchema: ComplianceFieldDef[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState(initial.category);
  const [fields, setFields] = useState<ComplianceFieldDef[]>(initial.field_schema);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          className={inputClass}
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className={inputClass}
        />
      </div>
      <FieldEditor fields={fields} onChange={setFields} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit(name, category, fields)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ComplianceDocumentTemplatesSection({
  templates,
  canEdit,
}: {
  templates: ComplianceDocumentTemplateSettingsData[];
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        Starter templates — adjust the field sets below any time. Exact fields typically get refined once
        licensing is finalised.
      </p>

      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {templates.map((template) =>
          editingId === template.id ? (
            <li key={template.id} className="py-3 first:pt-0">
              <TemplateForm
                initial={template}
                onSubmit={async (name, category, fieldSchema) => {
                  const formData = new FormData();
                  formData.set("name", name);
                  formData.set("category", category);
                  formData.set("field_schema", JSON.stringify(fieldSchema));
                  await updateComplianceDocumentTemplate(template.id, formData);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={template.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {template.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {template.category} · {template.field_schema.length} field
                    {template.field_schema.length === 1 ? "" : "s"}
                  </p>
                </div>
                {!template.active ? (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                    Inactive
                  </span>
                ) : null}
              </div>
              {canEdit ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingId(template.id)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label="Edit template"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleComplianceDocumentTemplateActive(template.id, !template.active)}
                    className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  >
                    {template.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ) : null}
            </li>
          ),
        )}
      </ul>

      {canEdit ? (
        adding ? (
          <TemplateForm
            initial={{ name: "", category: "", field_schema: [] }}
            onSubmit={async (name, category, fieldSchema) => {
              const formData = new FormData();
              formData.set("name", name);
              formData.set("category", category);
              formData.set("field_schema", JSON.stringify(fieldSchema));
              await createComplianceDocumentTemplate(formData);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add template
          </button>
        )
      ) : null}
    </div>
  );
}
