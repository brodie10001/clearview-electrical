"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WidgetCard } from "./widget-card";

export function PersonalNotesWidget({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setContent(value);
    setStatus("saving");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("personal_notes")
        .upsert({ user_id: user.id, content: value, updated_at: new Date().toISOString() });
      setStatus("saved");
    }, 700);
  }

  return (
    <WidgetCard
      title="Personal Notes"
      action={
        <span className="text-xs text-neutral-400">
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : ""}
        </span>
      }
    >
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot down anything for yourself — reminders, parts to order, ideas..."
        rows={5}
        className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
      />
    </WidgetCard>
  );
}
