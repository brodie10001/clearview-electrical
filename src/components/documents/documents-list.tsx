"use client";

import { useTransition } from "react";
import { FileImage } from "lucide-react";
import { updateDocumentCategory } from "@/app/(app)/documents/actions";
import type { DocumentType, PhotoCategory } from "@/types/database";

const PHOTO_CATEGORIES: PhotoCategory[] = [
  "Before",
  "After",
  "Issue-Defect",
  "Switchboard",
  "Testing-Compliance",
  "General",
];

export interface DocumentItem {
  id: string;
  type: DocumentType;
  photo_category: PhotoCategory | null;
  caption: string | null;
  createdAtLabel: string;
}

export function DocumentsList({
  documents,
  revalidatePaths,
}: {
  documents: DocumentItem[];
  revalidatePaths: string[];
}) {
  const [, startTransition] = useTransition();

  if (documents.length === 0) {
    return <p className="text-sm text-neutral-500">No documents on file yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <FileImage className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {doc.caption || doc.type.replace("_", " ")}
            </p>
            <p className="text-xs capitalize text-neutral-500">
              {doc.type.replace("_", " ")} · {doc.createdAtLabel}
            </p>
          </div>
          {doc.type === "photo" ? (
            <select
              value={doc.photo_category ?? ""}
              onChange={(e) =>
                startTransition(() =>
                  updateDocumentCategory(
                    doc.id,
                    e.target.value as PhotoCategory,
                    revalidatePaths,
                  ),
                )
              }
              className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {!doc.photo_category ? (
                <option value="" disabled>
                  Uncategorized
                </option>
              ) : null}
              {PHOTO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("-", " / ")}
                </option>
              ))}
            </select>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
