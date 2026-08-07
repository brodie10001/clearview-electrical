"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { updatePropertyStatus } from "../actions";
import type { PropertyStatus } from "@/types/database";

export function StatusToggle({ propertyId, status }: { propertyId: string; status: PropertyStatus }) {
  const [pending, startTransition] = useTransition();
  const isActive = status === "active";

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(() => updatePropertyStatus(propertyId, isActive ? "archived" : "active"))
      }
      className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {isActive ? (
        <>
          <Archive className="h-3.5 w-3.5" /> Archive
        </>
      ) : (
        <>
          <ArchiveRestore className="h-3.5 w-3.5" /> Reactivate
        </>
      )}
    </button>
  );
}
