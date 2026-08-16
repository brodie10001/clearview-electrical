"use client";

import { createClient } from "@/lib/supabase/client";
import { bulkCreateTestRecords, type TestSheetDefaults, type TestSheetCell } from "@/app/(app)/jobs/actions";

// Same client-side IndexedDB queue pattern as offline-photo-queue.ts (no
// Background Sync -- unsupported on iOS Safari, this app's primary
// target). Each queued item is a whole test sheet "save" (one job's worth
// of cells from one save action), not one row per cell -- bulkCreateTestRecords
// already writes one test_records insert per cell in a single batch, so
// queuing at the same granularity keeps a dropped connection mid-sheet from
// losing anything: the whole save either lands or stays queued, never
// half-applied.
//
// Conflict handling: test_records has no uniqueness constraint on
// (job_id, circuit_id, test_type_id), so two devices queuing entries for
// the same cell while both offline simply produce two historical rows once
// both flush -- never a silent overwrite. The sheet always shows the most
// recent by tested_at as "current"; older entries stay visible in history.
// Deliberately a separate IndexedDB database from offline-photo-queue.ts's
// "clearview-offline", not a second object store bolted onto it: that
// database is already shipped at version 1, and opening it here at a
// higher version to add a store would permanently bump its stored version
// number, which then throws a VersionError the next time
// offline-photo-queue.ts opens it at its own (lower) version 1 -- silently
// breaking the existing, already-in-production photo queue.
const DB_NAME = "clearview-offline-test-sheets";
const STORE_NAME = "pending-test-sheets";
const DB_VERSION = 1;

export interface QueuedTestSheet {
  id: string;
  jobId: string;
  defaults: TestSheetDefaults;
  cells: TestSheetCell[];
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineTestSheet(input: {
  jobId: string;
  defaults: TestSheetDefaults;
  cells: TestSheetCell[];
}): Promise<void> {
  const db = await openDb();
  const record: QueuedTestSheet = {
    id: crypto.randomUUID(),
    jobId: input.jobId,
    defaults: input.defaults,
    cells: input.cells,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedTestSheets(): Promise<QueuedTestSheet[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedTestSheet[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedTestSheetCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeQueuedTestSheet(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushOfflineTestSheetQueue(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: (await getQueuedTestSheets()).length };
  }

  // Only used to confirm there's a live session before attempting the
  // server actions below -- the actual writes go through bulkCreateTestRecords
  // (a Server Action), same as the rest of the app.
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { synced: 0, remaining: (await getQueuedTestSheets()).length };

  const sheets = await getQueuedTestSheets();
  let synced = 0;

  for (const sheet of sheets) {
    try {
      await bulkCreateTestRecords(sheet.jobId, sheet.defaults, sheet.cells);
    } catch {
      continue; // still offline, or a transient failure; retry next time
    }
    await removeQueuedTestSheet(sheet.id);
    synced++;
  }

  const remaining = (await getQueuedTestSheets()).length;
  return { synced, remaining };
}
