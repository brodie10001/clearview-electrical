"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackDialog } from "./feedback-dialog";
import { Toast } from "@/components/ui/toast";

// Mounted globally in the (app) layout, same tier as OfflinePhotoIndicator
// and QuickActionButton -- but pinned top-right so it never competes with
// the bottom nav / floating + button (both bottom-of-screen) or the
// offline-photo pill (top-center).
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pathname = usePathname();

  // The dashboard home page renders its own header with an equivalent
  // help/feedback button next to the profile menu -- both pinned top-right,
  // so this fixed-position button visually overlapped the profile menu on
  // narrow (mobile) widths there. Hide it on that one route rather than
  // repositioning it, since the header's own button already covers it.
  const isDashboardHome = pathname === "/";
  if (isDashboardHome) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        title="Send feedback"
        className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        <MessageSquarePlus className="h-4.5 w-4.5" />
      </button>

      <FeedbackDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => {
          setOpen(false);
          setToastMessage("Feedback sent — thanks!");
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  );
}
