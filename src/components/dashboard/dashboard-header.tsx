"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Settings } from "lucide-react";
import { greeting } from "@/lib/format";

export function DashboardHeader({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="flex flex-col gap-4 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">{greeting()}</p>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {firstName}
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers, properties, jobs..."
          className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        />
      </form>
    </header>
  );
}
