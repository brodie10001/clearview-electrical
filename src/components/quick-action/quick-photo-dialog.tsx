"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { queueOfflinePhoto } from "@/lib/offline-photo-queue";
import type { PhotoCategory } from "@/types/database";

interface PropertyOption {
  id: string;
  address: string;
}

const CATEGORIES: PhotoCategory[] = [
  "Before",
  "After",
  "Issue-Defect",
  "Switchboard",
  "Testing-Compliance",
  "General",
];

export function QuickPhotoDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<PhotoCategory | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("properties")
      .select("id, address")
      .order("address")
      .then(({ data }) => setProperties(data ?? []));
  }, [open]);

  function reset() {
    setFile(null);
    setCategory(null);
    setCaption("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !propertyId || !category) return;
    setBusy(true);
    setError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueOfflinePhoto({ propertyId, file, category, caption: caption || null });
      setBusy(false);
      reset();
      setQueuedMessage("No connection — photo saved on this device and will upload automatically once you're back online.");
      return;
    }

    const supabase = createClient();
    const path = `${propertyId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

    if (uploadError) {
      // Network-shaped failures (offline, flaky signal) fall back to the
      // local queue instead of surfacing an error the user can't act on.
      await queueOfflinePhoto({ propertyId, file, category, caption: caption || null });
      setBusy(false);
      reset();
      setQueuedMessage("Couldn't reach the server — photo saved on this device and will upload automatically once you're back online.");
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      property_id: propertyId,
      type: "photo",
      photo_category: category,
      file_url: path,
      caption: caption || null,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    reset();
    onClose();
    router.push(`/properties/${propertyId}`);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setQueuedMessage(null);
        onClose();
      }}
      title="Quick photo"
    >
      {queuedMessage ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{queuedMessage}</p>
          <button
            onClick={() => {
              setQueuedMessage(null);
              onClose();
            }}
            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Property
            </label>
            <select
              required
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            >
              <option value="" disabled>
                Select a property...
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Photo
            </label>
            <input
              required
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white dark:text-neutral-300"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={clsx(
                    "rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors",
                    category === c
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-400"
                      : "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  )}
                >
                  {c.replace("-", " / ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Caption (optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={busy || !file || !propertyId || !category}
            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Upload photo"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
