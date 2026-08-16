"use client";

import { useState } from "react";
import { Plus, Pencil, X, ArchiveRestore, Archive } from "lucide-react";
import { clsx } from "clsx";
import {
  createPropertyCircuit,
  updatePropertyCircuit,
  archivePropertyCircuit,
} from "../actions";
import type { PropertyCircuitData } from "./page";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function circuitLabel(circuit: PropertyCircuitData) {
  return `${circuit.circuit_number} — ${circuit.description}`;
}

// Reusable circuit schedule stored against the property, not the job:
// enter a board once here and it's available on every future job at this
// address (and inside the test sheet on any of those jobs). Circuits are
// archived, never deleted -- a circuit with historical test data can't be
// removed out from under those records (test_records.circuit_id is
// on delete restrict).
export function CircuitSchedule({
  propertyId,
  circuits,
  canEdit,
}: {
  propertyId: string;
  circuits: PropertyCircuitData[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visibleCircuits = showArchived ? circuits : circuits.filter((c) => c.is_active);

  const groups = new Map<string, PropertyCircuitData[]>();
  for (const circuit of visibleCircuits) {
    const key = circuit.switchboard_ref ?? "";
    const list = groups.get(key) ?? [];
    list.push(circuit);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Circuit schedule
        </h3>
        {circuits.some((c) => !c.is_active) ? (
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Show archived
          </label>
        ) : null}
      </div>

      {visibleCircuits.length === 0 && !adding ? (
        <p className="text-sm text-neutral-500">
          No circuits recorded yet. Enter the switchboard once here and it&apos;s reused on every
          job at this property.
        </p>
      ) : (
        Array.from(groups.entries()).map(([switchboardRef, group]) => (
          <div key={switchboardRef || "default"} className="flex flex-col gap-2">
            {switchboardRef ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {switchboardRef}
              </p>
            ) : null}
            <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {group.map((circuit) =>
                editingId === circuit.id ? (
                  <CircuitForm
                    key={circuit.id}
                    propertyId={propertyId}
                    circuit={circuit}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <li
                    key={circuit.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p
                        className={clsx(
                          "truncate text-sm font-medium",
                          circuit.is_active
                            ? "text-neutral-900 dark:text-neutral-50"
                            : "text-neutral-400 line-through dark:text-neutral-600",
                        )}
                      >
                        {circuitLabel(circuit)}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {[
                          circuit.protective_device_type,
                          circuit.protective_device_rating,
                          circuit.cable_size,
                          circuit.rcd_protected ? `RCD${circuit.rcd_ref ? ` (${circuit.rcd_ref})` : ""}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No device details"}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => setEditingId(circuit.id)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          aria-label="Edit circuit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            archivePropertyCircuit(circuit.id, propertyId, !circuit.is_active)
                          }
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          aria-label={circuit.is_active ? "Archive circuit" : "Restore circuit"}
                        >
                          {circuit.is_active ? (
                            <Archive className="h-3.5 w-3.5" />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          </div>
        ))
      )}

      {canEdit ? (
        adding ? (
          <CircuitForm propertyId={propertyId} onDone={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add circuit
          </button>
        )
      ) : null}
    </div>
  );
}

function CircuitForm({
  propertyId,
  circuit,
  onDone,
}: {
  propertyId: string;
  circuit?: PropertyCircuitData;
  onDone: () => void;
}) {
  const [rcdProtected, setRcdProtected] = useState(circuit?.rcd_protected ?? false);

  return (
    <li className="flex flex-col gap-2 border-b border-neutral-100 p-3 last:border-b-0 dark:border-neutral-800">
      <form
        action={async (formData) => {
          if (circuit) {
            await updatePropertyCircuit(circuit.id, propertyId, formData);
          } else {
            await createPropertyCircuit(propertyId, formData);
          }
          onDone();
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Switchboard</label>
            <input
              name="switchboard_ref"
              placeholder="Main"
              defaultValue={circuit?.switchboard_ref ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Circuit no.</label>
            <input
              name="circuit_number"
              required
              defaultValue={circuit?.circuit_number ?? ""}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Description</label>
            <input
              name="description"
              required
              placeholder="e.g. Kitchen GPOs"
              defaultValue={circuit?.description ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Device type</label>
            <input
              name="protective_device_type"
              placeholder="MCB / RCBO"
              defaultValue={circuit?.protective_device_type ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Device rating</label>
            <input
              name="protective_device_rating"
              placeholder="20A C-curve"
              defaultValue={circuit?.protective_device_rating ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Cable size</label>
            <input
              name="cable_size"
              placeholder="2.5mm"
              defaultValue={circuit?.cable_size ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col justify-end gap-1 pb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <input
                name="rcd_protected"
                type="checkbox"
                defaultChecked={rcdProtected}
                onChange={(e) => setRcdProtected(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              RCD protected
            </label>
          </div>
        </div>
        {rcdProtected ? (
          <div className="flex flex-col gap-1 sm:max-w-xs">
            <label className="text-xs font-medium text-neutral-500">
              RCD reference{" "}
              <span className="text-neutral-400">
                (same value on every circuit sharing one physical RCD)
              </span>
            </label>
            <input
              name="rcd_ref"
              placeholder="e.g. RCD1"
              defaultValue={circuit?.rcd_ref ?? ""}
              className={inputClass}
            />
          </div>
        ) : null}
        <div className="flex gap-1">
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
