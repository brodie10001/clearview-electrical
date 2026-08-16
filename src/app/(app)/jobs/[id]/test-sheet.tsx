"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, CheckCircle2, XCircle, Plus } from "lucide-react";
import { clsx } from "clsx";
import { bulkCreateTestRecords } from "../actions";
import { createPropertyCircuit } from "@/app/(app)/properties/actions";
import { queueOfflineTestSheet } from "@/lib/offline-test-sheet-queue";
import type { TestResult } from "@/types/database";
import type { TestTypeOption, CircuitOption } from "./compliance-section";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

// The AS/NZS 3000 core test set (see the test sheet brief). Fixed columns,
// not driven off the full test_types list -- the sheet is a purpose-built
// grid over a known set, not a generic form. Custom/one-off tests stay on
// the existing one-at-a-time Add form, which is untouched by this.
const COLUMNS = [
  {
    key: "earthContinuity",
    label: "Earth Cont.",
    unit: "Ω",
    typeName: "Earth Continuity",
    kind: "numeric",
    rcdOnly: false,
  },
  {
    key: "insulationResistance",
    label: "Insulation Res.",
    unit: "MΩ",
    typeName: "Insulation Resistance",
    kind: "numeric",
    rcdOnly: false,
  },
  {
    key: "polarity",
    label: "Polarity",
    unit: null,
    typeName: "Polarity",
    kind: "passfail",
    rcdOnly: false,
  },
  {
    key: "correctConnections",
    label: "Correct Conn.",
    unit: null,
    typeName: "Correct Circuit Connections",
    kind: "passfail",
    rcdOnly: false,
  },
  {
    key: "faultLoop",
    label: "Fault Loop",
    unit: "Ω",
    typeName: "Fault Loop/Earth Fault Loop",
    kind: "numeric",
    rcdOnly: false,
  },
  {
    key: "rcdTripTime",
    label: "RCD Trip Time",
    unit: "ms",
    typeName: "RCD/RCBO Testing",
    kind: "numeric",
    rcdOnly: true,
  },
  {
    key: "rcdTripCurrent",
    label: "RCD Trip Current",
    unit: "mA",
    typeName: "RCD Trip Current",
    kind: "numeric",
    rcdOnly: true,
  },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

interface CellState {
  value: string;
  result: TestResult | null;
}

type RowState = Record<ColumnKey, CellState>;

function emptyCell(): CellState {
  return { value: "", result: null };
}

function emptyRow(): RowState {
  return {
    earthContinuity: emptyCell(),
    insulationResistance: emptyCell(),
    polarity: emptyCell(),
    correctConnections: emptyCell(),
    faultLoop: emptyCell(),
    rcdTripTime: emptyCell(),
    rcdTripCurrent: emptyCell(),
  };
}

function cellIsFilled(cell: CellState, kind: "numeric" | "passfail") {
  return kind === "numeric" ? cell.value.trim() !== "" : cell.result !== null;
}

function rcdGroupKey(circuit: CircuitOption) {
  return circuit.rcd_protected && circuit.rcd_ref
    ? `${circuit.switchboard_ref ?? ""}::${circuit.rcd_ref}`
    : null;
}

export function TestSheet({
  jobId,
  propertyId,
  circuits,
  testTypes,
  workers,
  currentUserId,
  onClose,
  onSaved,
  onCircuitsChanged,
}: {
  jobId: string;
  propertyId: string;
  circuits: CircuitOption[];
  testTypes: TestTypeOption[];
  workers: { id: string; full_name: string | null; email: string | null }[];
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
  onCircuitsChanged: () => void;
}) {
  const testTypeIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of testTypes) map.set(t.name, t.id);
    return map;
  }, [testTypes]);

  const [instrumentUsed, setInstrumentUsed] = useState("");
  const [testedBy, setTestedBy] = useState(currentUserId);
  const [testedAt, setTestedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Map<string, RowState>>(
    () => new Map(circuits.map((c) => [c.id, emptyRow()])),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingCircuit, setAddingCircuit] = useState(circuits.length === 0);
  const [addCircuitError, setAddCircuitError] = useState<string | null>(null);
  const [addingCircuitPending, setAddingCircuitPending] = useState(false);

  async function handleAddCircuit(formData: FormData) {
    setAddingCircuitPending(true);
    setAddCircuitError(null);
    try {
      await createPropertyCircuit(propertyId, formData);
      // Adding a circuit mid-sheet must not lose unsaved entries: rows
      // is keyed by circuit id and only ever grows here (existing entries
      // are never touched), and onCircuitsChanged just asks the parent to
      // re-fetch circuits -- the new circuit's row lazily defaults to
      // emptyRow() wherever it's read, same as every existing row.
      onCircuitsChanged();
      setAddingCircuit(false);
    } catch (err) {
      setAddCircuitError(err instanceof Error ? err.message : "Failed to add circuit.");
    } finally {
      setAddingCircuitPending(false);
    }
  }

  function setCell(circuitId: string, column: ColumnKey, patch: Partial<CellState>) {
    setRows((prev) => {
      const next = new Map(prev);
      const row = { ...(next.get(circuitId) ?? emptyRow()) };
      row[column] = { ...row[column], ...patch };
      next.set(circuitId, row);
      return next;
    });
  }

  // Which circuit currently "owns" the entered RCD value for each shared
  // group, so every sibling circuit in that group can display it read-only
  // instead of prompting for it again.
  const rcdOwnerByGroup = useMemo(() => {
    const owner = new Map<string, string>();
    for (const circuit of circuits) {
      const key = rcdGroupKey(circuit);
      if (!key || owner.has(key)) continue;
      const row = rows.get(circuit.id);
      if (row && (row.rcdTripTime.value.trim() || row.rcdTripCurrent.value.trim())) {
        owner.set(key, circuit.id);
      }
    }
    return owner;
  }, [circuits, rows]);

  const summary = useMemo(() => {
    let tested = 0;
    let passed = 0;
    let failed = 0;
    for (const circuit of circuits) {
      const row = rows.get(circuit.id);
      if (!row) continue;
      for (const col of COLUMNS) {
        if (col.rcdOnly && !circuit.rcd_protected) continue;
        // Inherited RCD cells on non-owning circuits aren't separately
        // "tested" -- they display the owning circuit's result, not a new one.
        const groupKey = rcdGroupKey(circuit);
        if (
          (col.key === "rcdTripTime" || col.key === "rcdTripCurrent") &&
          groupKey &&
          rcdOwnerByGroup.get(groupKey) !== circuit.id
        ) {
          continue;
        }
        const cell = row[col.key];
        if (!cellIsFilled(cell, col.kind)) continue;
        tested++;
        if (cell.result === "Pass") passed++;
        if (cell.result === "Fail") failed++;
      }
    }
    return { tested, passed, failed };
  }, [circuits, rows, rcdOwnerByGroup]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const cells: Parameters<typeof bulkCreateTestRecords>[2] = [];
      for (const circuit of circuits) {
        const row = rows.get(circuit.id);
        if (!row) continue;
        for (const col of COLUMNS) {
          if (col.rcdOnly && !circuit.rcd_protected) continue;
          const groupKey = rcdGroupKey(circuit);
          if (
            (col.key === "rcdTripTime" || col.key === "rcdTripCurrent") &&
            groupKey &&
            rcdOwnerByGroup.get(groupKey) !== circuit.id
          ) {
            // Inherited display-only on this circuit -- don't double-write it.
            continue;
          }
          const cell = row[col.key];
          if (!cellIsFilled(cell, col.kind)) continue;
          if (cell.result === null) continue; // requires an explicit result, never guessed

          const testTypeId = testTypeIdByName.get(col.typeName);
          if (!testTypeId) continue; // test type not seeded for this business yet

          cells.push({
            circuitId: circuit.id,
            circuitOrEquipment: `${circuit.circuit_number} — ${circuit.description}`,
            testTypeId,
            measuredValue: col.kind === "numeric" && cell.value.trim() ? Number(cell.value) : null,
            result: cell.result,
            instrumentUsed: null,
            testedBy: null,
            notes: null,
          });
        }
      }

      if (cells.length === 0) {
        setError("Nothing entered yet.");
        setSaving(false);
        return;
      }

      const defaults = {
        instrumentUsed: instrumentUsed.trim() || null,
        testedBy: testedBy || null,
        testedAt: new Date(testedAt).toISOString(),
      };

      // Offline (e.g. a roof space with no reception): queue the whole
      // sheet's worth of cells as one batch and let OfflineTestSheetIndicator
      // sync it once connectivity returns, rather than losing the entry or
      // blocking on a network call that isn't going to succeed. Checked
      // upfront rather than only on failure, so an offline save is treated
      // as "queued" from the start, not as an error.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOfflineTestSheet({ jobId, defaults, cells });
        onSaved();
        return;
      }

      await bulkCreateTestRecords(jobId, defaults, cells);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save test sheet.");
      setSaving(false);
    }
  }

  if (circuits.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-4 dark:bg-neutral-900">
          <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            No circuits yet
          </h2>
          <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
            This property has no circuit schedule yet. Add the first circuit here to start the
            test sheet -- it&apos;s saved to the property, so it&apos;s reused on every future job
            here too.
          </p>
          <AddCircuitForm
            pending={addingCircuitPending}
            error={addCircuitError}
            onSubmit={handleAddCircuit}
          />
          <button
            onClick={onClose}
            className="mt-3 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-950">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Test sheet</h2>
        <button
          onClick={onClose}
          aria-label="Close test sheet"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Instrument used</label>
          <input
            value={instrumentUsed}
            onChange={(e) => setInstrumentUsed(e.target.value)}
            className={clsx(inputClass, "w-36")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Tested by</label>
          <select
            value={testedBy}
            onChange={(e) => setTestedBy(e.target.value)}
            className={clsx(inputClass, "w-36")}
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name || w.email}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Date</label>
          <input
            type="date"
            value={testedAt}
            onChange={(e) => setTestedAt(e.target.value)}
            className={clsx(inputClass, "w-36")}
          />
        </div>
        <button
          type="button"
          onClick={() => setAddingCircuit(true)}
          className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add circuit
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
          <span>{summary.tested} tested</span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {summary.passed}
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5" /> {summary.failed}
          </span>
        </div>
      </div>

      {addingCircuit ? (
        <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
          <AddCircuitForm
            pending={addingCircuitPending}
            error={addCircuitError}
            onSubmit={handleAddCircuit}
            onCancel={() => setAddingCircuit(false)}
          />
        </div>
      ) : null}

      {/* Tablet/desktop: grid, frozen circuit column, horizontal scroll. */}
      <div className="hidden flex-1 overflow-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-neutral-950">
            <tr>
              <th className="sticky left-0 z-20 min-w-[180px] border-b border-r border-neutral-200 bg-white p-2 text-left dark:border-neutral-800 dark:bg-neutral-950">
                Circuit
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="min-w-[140px] border-b border-neutral-200 p-2 text-left font-medium text-neutral-500 dark:border-neutral-800"
                >
                  {col.label} {col.unit ? `(${col.unit})` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {circuits.map((circuit) => (
              <tr key={circuit.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="sticky left-0 z-10 min-w-[180px] border-r border-neutral-200 bg-white p-2 font-medium text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50">
                  {circuit.circuit_number} — {circuit.description}
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} className="p-2">
                    <TestCell
                      circuit={circuit}
                      column={col}
                      row={rows.get(circuit.id) ?? emptyRow()}
                      rcdOwnerByGroup={rcdOwnerByGroup}
                      onChange={(patch) => setCell(circuit.id, col.key, patch)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: one circuit per screen -- a grid is unusable at ~390px. */}
      <div className="flex flex-1 flex-col overflow-y-auto p-3 sm:hidden">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="rounded-md p-1.5 text-neutral-400 disabled:opacity-30"
            aria-label="Previous circuit"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-xs font-medium text-neutral-500">
            Circuit {stepIndex + 1} of {circuits.length}
          </p>
          <button
            onClick={() => setStepIndex((i) => Math.min(circuits.length - 1, i + 1))}
            disabled={stepIndex === circuits.length - 1}
            className="rounded-md p-1.5 text-neutral-400 disabled:opacity-30"
            aria-label="Next circuit"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {(() => {
          const circuit = circuits[stepIndex];
          const row = rows.get(circuit.id) ?? emptyRow();
          return (
            <div className="flex flex-col gap-4">
              <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {circuit.circuit_number} — {circuit.description}
              </p>
              {COLUMNS.map((col) => (
                <div key={col.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-500">
                    {col.label} {col.unit ? `(${col.unit})` : ""}
                  </label>
                  <TestCell
                    circuit={circuit}
                    column={col}
                    row={row}
                    rcdOwnerByGroup={rcdOwnerByGroup}
                    onChange={(patch) => setCell(circuit.id, col.key, patch)}
                    stacked
                  />
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {error ? (
        <p className="border-t border-neutral-200 px-3 py-2 text-xs text-red-600 dark:border-neutral-800 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save test sheet"}
        </button>
      </div>
    </div>
  );
}

function TestCell({
  circuit,
  column,
  row,
  rcdOwnerByGroup,
  onChange,
  stacked,
}: {
  circuit: CircuitOption;
  column: (typeof COLUMNS)[number];
  row: RowState;
  rcdOwnerByGroup: Map<string, string>;
  onChange: (patch: Partial<CellState>) => void;
  stacked?: boolean;
}) {
  if (column.rcdOnly && !circuit.rcd_protected) {
    return <span className="text-xs text-neutral-300 dark:text-neutral-700">—</span>;
  }

  const groupKey = rcdGroupKey(circuit);
  const isInheritedRcd =
    (column.key === "rcdTripTime" || column.key === "rcdTripCurrent") &&
    groupKey != null &&
    rcdOwnerByGroup.has(groupKey) &&
    rcdOwnerByGroup.get(groupKey) !== circuit.id;

  if (isInheritedRcd) {
    return (
      <span
        className="text-xs text-neutral-400 italic dark:text-neutral-500"
        title="Same physical RCD as another circuit -- entered there"
      >
        Inherited
      </span>
    );
  }

  const cell = row[column.key];

  if (column.kind === "passfail") {
    return (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange({ result: cell.result === "Pass" ? null : "Pass" })}
          className={clsx(
            "rounded-md px-2 py-1 text-xs font-semibold",
            cell.result === "Pass"
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
          )}
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => onChange({ result: cell.result === "Fail" ? null : "Fail" })}
          className={clsx(
            "rounded-md px-2 py-1 text-xs font-semibold",
            cell.result === "Fail"
              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
          )}
        >
          Fail
        </button>
      </div>
    );
  }

  return (
    <div className={clsx("flex gap-1", stacked ? "flex-row" : "flex-col")}>
      <input
        inputMode="decimal"
        value={cell.value}
        onChange={(e) => onChange({ value: e.target.value })}
        className={clsx(inputClass, "w-20 py-1 text-xs")}
        placeholder={column.unit ?? ""}
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange({ result: cell.result === "Pass" ? null : "Pass" })}
          className={clsx(
            "rounded-md px-1.5 py-1 text-[11px] font-semibold",
            cell.result === "Pass"
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
          )}
        >
          P
        </button>
        <button
          type="button"
          onClick={() => onChange({ result: cell.result === "Fail" ? null : "Fail" })}
          className={clsx(
            "rounded-md px-1.5 py-1 text-[11px] font-semibold",
            cell.result === "Fail"
              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
          )}
        >
          F
        </button>
      </div>
    </div>
  );
}

function AddCircuitForm({
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (formData: FormData) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [rcdProtected, setRcdProtected] = useState(false);

  return (
    <form
      action={async (formData) => {
        await onSubmit(formData);
      }}
      className="flex flex-col gap-2"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input name="switchboard_ref" placeholder="Switchboard (optional)" className={inputClass} />
        <input name="circuit_number" required placeholder="Circuit no." className={inputClass} />
        <input
          name="description"
          required
          placeholder="Description, e.g. Kitchen GPOs"
          className={clsx(inputClass, "col-span-2")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input name="protective_device_rating" placeholder="Device rating (optional)" className={inputClass} />
        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
          <input
            name="rcd_protected"
            type="checkbox"
            checked={rcdProtected}
            onChange={(e) => setRcdProtected(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          RCD protected
        </label>
        {rcdProtected ? (
          <input name="rcd_ref" placeholder="RCD ref, e.g. RCD1" className={clsx(inputClass, "w-28")} />
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add circuit"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
