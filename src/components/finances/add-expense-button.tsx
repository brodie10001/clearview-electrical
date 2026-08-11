"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";

export function AddExpenseButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        <Plus className="h-4 w-4" /> Add Expense
      </button>
      <ExpenseDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
