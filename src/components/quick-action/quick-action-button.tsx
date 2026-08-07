"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, Camera, Receipt, FileText, X } from "lucide-react";
import { clsx } from "clsx";
import { QuickPhotoDialog } from "./quick-photo-dialog";
import { NewQuoteDialog } from "./new-quote-dialog";
import { Dialog } from "@/components/ui/dialog";

export function QuickActionButton() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  const actions = [
    {
      label: "New Job",
      icon: Briefcase,
      onSelect: () => router.push("/jobs/new"),
    },
    {
      label: "New Quote",
      icon: FileText,
      onSelect: () => setQuoteDialogOpen(true),
    },
    {
      label: "Log Expense",
      icon: Receipt,
      onSelect: () => setExpenseDialogOpen(true),
    },
    {
      label: "Quick Photo",
      icon: Camera,
      onSelect: () => setPhotoDialogOpen(true),
    },
  ];

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
        {menuOpen
          ? actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => {
                    setMenuOpen(false);
                    action.onSelect();
                  }}
                  className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-3 pr-4 text-sm font-medium text-neutral-800 shadow-lg ring-1 ring-black/5 transition hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-white/10 dark:hover:bg-neutral-700"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  {action.label}
                </button>
              );
            })
          : null}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close quick actions" : "Open quick actions"}
          aria-expanded={menuOpen}
          className={clsx(
            "flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 transition-transform hover:bg-amber-600",
            menuOpen && "rotate-45",
          )}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen ? (
        <button
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <QuickPhotoDialog open={photoDialogOpen} onClose={() => setPhotoDialogOpen(false)} />

      <NewQuoteDialog open={quoteDialogOpen} onClose={() => setQuoteDialogOpen(false)} />

      <Dialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        title="Log Expense"
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Expense tracking is coming soon. It&apos;ll live alongside invoicing in the
          Finances tab.
        </p>
      </Dialog>
    </>
  );
}
