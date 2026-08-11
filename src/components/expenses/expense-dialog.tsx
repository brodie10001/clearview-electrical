"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";

interface CategoryOption {
  id: string;
  name: string;
}
interface SupplierOption {
  id: string;
  name: string;
}
interface JobOption {
  id: string;
  properties: { address: string; customers: { name: string } | null } | null;
}

function todayLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);

  const [date, setDate] = useState(todayLocalDateString());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [gstIncluded, setGstIncluded] = useState(true);
  const [gstAmount, setGstAmount] = useState("");
  const [gstEdited, setGstEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [jobId, setJobId] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("expense_categories").select("id, name").order("name").returns<CategoryOption[]>(),
      supabase.from("suppliers").select("id, name").eq("active", true).order("name").returns<SupplierOption[]>(),
      supabase
        .from("jobs")
        .select("id, properties(address, customers(name))")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .returns<JobOption[]>(),
    ]).then(([categoriesRes, suppliersRes, jobsRes]) => {
      setCategories(categoriesRes.data ?? []);
      setSuppliers(suppliersRes.data ?? []);
      setJobs(jobsRes.data ?? []);
    });
  }, [open]);

  // Auto-fills the GST component from the GST-inclusive total whenever GST
  // applies -- stays editable (gstEdited) so an expense mixing GST-free and
  // GST-bearing items can override it, per the "manually overridable" spec.
  // Derived at render time rather than via an effect + setState, since it's
  // purely a function of amount/gstIncluded/gstEdited.
  const displayedGstAmount = gstEdited
    ? gstAmount
    : gstIncluded && Number(amount) > 0
      ? (Number(amount) / 11).toFixed(2)
      : "";

  function reset() {
    setDate(todayLocalDateString());
    setDescription("");
    setAmount("");
    setGstIncluded(true);
    setGstAmount("");
    setGstEdited(false);
    setCategoryId("");
    setAddingCategory(false);
    setNewCategoryName("");
    setSupplierId("");
    setJobId("");
    setReceipt(null);
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    let finalCategoryId = categoryId;

    if (addingCategory) {
      const name = newCategoryName.trim();
      if (!name) {
        setError("Enter a name for the new category.");
        setBusy(false);
        return;
      }
      const { data: created, error: categoryError } = await supabase
        .from("expense_categories")
        .insert({ name })
        .select("id")
        .single();
      if (categoryError || !created) {
        setError(categoryError?.message ?? "Failed to create category.");
        setBusy(false);
        return;
      }
      finalCategoryId = created.id;
    }

    if (!finalCategoryId) {
      setError("Choose a category.");
      setBusy(false);
      return;
    }

    let receiptUrl: string | null = null;
    if (receipt) {
      const path = `expenses/${Date.now()}-${receipt.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, receipt);
      if (uploadError) {
        setError(uploadError.message);
        setBusy(false);
        return;
      }
      receiptUrl = path;
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      date,
      description,
      amount: Number(amount),
      gst_included: gstIncluded,
      gst_amount: gstIncluded ? Number(displayedGstAmount || 0) : 0,
      category_id: finalCategoryId,
      supplier_id: supplierId || null,
      job_id: jobId || null,
      receipt_url: receiptUrl,
      notes: notes || null,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    reset();
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add expense"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Amount (total)
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            required
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={gstIncluded}
              onChange={(e) => setGstIncluded(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
            />
            GST included
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              GST amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={!gstIncluded}
              value={displayedGstAmount}
              onChange={(e) => {
                setGstEdited(true);
                setGstAmount(e.target.value);
              }}
              placeholder={gstIncluded ? "Auto: amount ÷ 11" : "—"}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Category
            </label>
            <button
              type="button"
              onClick={() => setAddingCategory((v) => !v)}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              {addingCategory ? "Choose existing" : "+ New category"}
            </button>
          </div>
          {addingCategory ? (
            <input
              required
              type="text"
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          ) : (
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            >
              <option value="" disabled>
                Select a category...
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Supplier (optional)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            >
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Job (optional)
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            >
              <option value="">None — general/overhead</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.properties?.address ?? "Unknown property"}
                  {job.properties?.customers?.name ? ` — ${job.properties.customers.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="-mt-2 text-xs text-neutral-500">
          Linking a job makes this a direct job cost. Leave it as None for general business
          overhead.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Receipt (optional)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white dark:text-neutral-300"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || !description || !amount}
          className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Add expense"}
        </button>
      </form>
    </Dialog>
  );
}
