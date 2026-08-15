"use client";

import { useMemo, useState } from "react";
import { Plus, CheckCircle2, Circle, Trash2, StickyNote } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { WidgetCard } from "./widget-card";

export interface NoteItem {
  id: string;
  text: string;
  is_checked: boolean;
  position: number;
}

export function PersonalNotesWidget({ initialItems }: { initialItems: NoteItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [newText, setNewText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
        return a.position - b.position;
      }),
    [items],
  );

  async function addItem() {
    const text = newText.trim();
    if (!text) return;
    setNewText("");
    setStatus("saving");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { data } = await supabase
      .from("personal_note_items")
      .insert({ user_id: user.id, text, position: nextPosition })
      .select("id, text, is_checked, position")
      .single();

    if (data) setItems((prev) => [...prev, data]);
    setStatus("saved");
  }

  async function toggleItem(id: string, isChecked: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_checked: isChecked } : i)));
    setStatus("saving");
    const supabase = createClient();
    await supabase.from("personal_note_items").update({ is_checked: isChecked }).eq("id", id);
    setStatus("saved");
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setStatus("saving");
    const supabase = createClient();
    await supabase.from("personal_note_items").delete().eq("id", id);
    setStatus("saved");
  }

  return (
    <WidgetCard
      id="personal-notes"
      title="Personal Notes"
      icon={<StickyNote className="h-4 w-4 text-neutral-400" />}
      action={
        <span className="text-xs text-neutral-400">
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : ""}
        </span>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        className="mb-3 flex items-center gap-1.5"
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a note..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        />
        <button
          type="submit"
          disabled={!newText.trim()}
          aria-label="Add note"
          className="flex shrink-0 items-center justify-center rounded-lg bg-amber-500 p-1.5 text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {sortedItems.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing here yet.</p>
      ) : (
        <ul className="flex max-h-52 flex-col divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
          {sortedItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <button
                onClick={() => toggleItem(item.id, !item.is_checked)}
                aria-label={item.is_checked ? "Mark as not done" : "Mark as done"}
                className={clsx(
                  "shrink-0",
                  item.is_checked
                    ? "text-emerald-500"
                    : "text-neutral-300 hover:text-neutral-400 dark:text-neutral-600 dark:hover:text-neutral-500",
                )}
              >
                {item.is_checked ? (
                  <CheckCircle2 className="h-4.5 w-4.5" fill="currentColor" strokeWidth={1.5} />
                ) : (
                  <Circle className="h-4.5 w-4.5" />
                )}
              </button>
              <span
                className={clsx(
                  "min-w-0 flex-1 truncate text-sm",
                  item.is_checked
                    ? "text-neutral-400 line-through dark:text-neutral-600"
                    : "text-neutral-900 dark:text-neutral-50",
                )}
              >
                {item.text}
              </span>
              <button
                onClick={() => deleteItem(item.id)}
                aria-label="Delete note"
                className="shrink-0 rounded-md p-1 text-neutral-300 hover:bg-neutral-100 hover:text-red-600 dark:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
