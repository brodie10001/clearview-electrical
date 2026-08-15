"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { Toast } from "@/components/ui/toast";

// Reuses the existing feedback system (also reachable via the floating
// FeedbackButton) rather than inventing a separate help/support flow --
// sending feedback (including "I'm stuck / how do I...") is the only real
// support channel this app has today.
export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help and feedback"
        title="Help and feedback"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      <FeedbackDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => {
          setOpen(false);
          setToastMessage("Thanks — we'll take a look.");
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  );
}
