"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/supabase/actions";

export function ProfileMenu({
  displayName,
  role,
}: {
  displayName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-neutral-400 sm:block" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {displayName}
            </p>
            <p className="truncate text-xs capitalize text-neutral-500">{role}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Settings className="h-4 w-4 text-neutral-400" />
            Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <LogOut className="h-4 w-4 text-neutral-400" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
