"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// First toast/snackbar in the app -- deliberately minimal (message +
// auto-dismiss) rather than a global provider/queue, since nothing else
// needs one yet. The caller owns the message state and passes null to hide.
export function Toast({
  message,
  onDismiss,
  durationMs = 3000,
}: {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-neutral-50 dark:text-neutral-900">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" />
        {message}
      </div>
    </div>
  );
}
