"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { getQueuedPhotoCount, flushOfflinePhotoQueue } from "@/lib/offline-photo-queue";

export function OfflinePhotoIndicator() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshCount = useCallback(async () => {
    setCount(await getQueuedPhotoCount());
  }, []);

  const tryFlush = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setFlushing(true);
    const { uploaded } = await flushOfflinePhotoQueue();
    await refreshCount();
    setFlushing(false);
    if (uploaded > 0) router.refresh();
  }, [refreshCount, router]);

  useEffect(() => {
    // Syncing IndexedDB state (client-only, unavailable during SSR) into
    // React on mount is exactly what this effect is for — there's no
    // render-time alternative.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCount();
    tryFlush();
    window.addEventListener("online", tryFlush);
    const interval = setInterval(refreshCount, 20000);
    return () => {
      window.removeEventListener("online", tryFlush);
      clearInterval(interval);
    };
  }, [refreshCount, tryFlush]);

  if (count === 0) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
      <CloudUpload className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">
        {count} photo{count === 1 ? "" : "s"} pending upload
      </span>
      <button
        onClick={tryFlush}
        disabled={flushing}
        aria-label="Retry upload"
        className="shrink-0 rounded-full p-1 hover:bg-white/10 dark:hover:bg-black/10"
      >
        <RefreshCw className={clsx("h-3.5 w-3.5", flushing && "animate-spin")} />
      </button>
    </div>
  );
}
