"use client";

import { createClient } from "@/lib/supabase/client";
import type { PhotoCategory } from "@/types/database";

// Client-side (not service-worker Background Sync) queue for photos
// captured with no connectivity — Background Sync isn't supported on iOS
// Safari, which is this app's primary target, so the app itself is
// responsible for retrying: on mount and whenever the browser regains a
// connection (see OfflinePhotoIndicator).
const DB_NAME = "clearview-offline";
const STORE_NAME = "pending-photos";
const DB_VERSION = 1;

export interface QueuedPhoto {
  id: string;
  propertyId: string;
  category: PhotoCategory;
  caption: string | null;
  fileName: string;
  mimeType: string;
  blob: Blob;
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

export async function queueOfflinePhoto(input: {
  propertyId: string;
  file: File;
  category: PhotoCategory;
  caption: string | null;
}): Promise<void> {
  const db = await openDb();
  const record: QueuedPhoto = {
    id: crypto.randomUUID(),
    propertyId: input.propertyId,
    category: input.category,
    caption: input.caption,
    fileName: input.file.name,
    mimeType: input.file.type,
    blob: input.file,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedPhotos(): Promise<QueuedPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedPhoto[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedPhotoCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeQueuedPhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushOfflinePhotoQueue(): Promise<{ uploaded: number; remaining: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { uploaded: 0, remaining: (await getQueuedPhotos()).length };
  }

  const supabase = createClient();
  const photos = await getQueuedPhotos();
  let uploaded = 0;

  for (const photo of photos) {
    const path = `${photo.propertyId}/${new Date(photo.createdAt).getTime()}-${photo.fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, photo.blob, { contentType: photo.mimeType || undefined });
    if (uploadError) continue; // still offline or a transient failure; retry next time

    const { error: insertError } = await supabase.from("documents").insert({
      property_id: photo.propertyId,
      type: "photo",
      photo_category: photo.category,
      file_url: path,
      caption: photo.caption,
    });
    if (insertError) continue;

    await removeQueuedPhoto(photo.id);
    uploaded++;
  }

  const remaining = (await getQueuedPhotos()).length;
  return { uploaded, remaining };
}
