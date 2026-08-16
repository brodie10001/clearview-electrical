"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { getQueuedTestSheetCount, flushOfflineTestSheetQueue } from "@/lib/offline-test-sheet-queue";

// Same pattern as OfflinePhotoIndicator, separate pill (own IndexedDB
// database -- see offline-test-sheet-queue.ts for why it isn't sharing the
// photo queue's). Positioned slightly below the photo indicator's spot so
// the two don't sit on top of each other on the rare occasion both queues
// are non-empty at once.
export function OfflineTestSheetIndicator() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshCount = useCallback(async () => {
    setCount(await getQueuedTestSheetCount());
  }, []);

  const tryFlush = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setFlushing(true);
    const { synced } = await flushOfflineTestSheetQueue();
    await refreshCount();
    setFlushing(false);
    if (synced > 0) router.refresh();
  }, [refreshCount, router]);

  useEffect(() => {
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
    <div className="fixed top-[calc(env(safe-area-inset-top)+3.25rem)] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
      <ClipboardList className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">
        {count} test sheet{count === 1 ? "" : "s"} pending sync
      </span>
      <button
        onClick={tryFlush}
        disabled={flushing}
        aria-label="Retry sync"
        className="shrink-0 rounded-full p-1 hover:bg-white/10 dark:hover:bg-black/10"
      >
        <RefreshCw className={clsx("h-3.5 w-3.5", flushing && "animate-spin")} />
      </button>
    </div>
  );
}
