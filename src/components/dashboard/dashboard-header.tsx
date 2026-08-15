"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Users, Building2, Briefcase, FileText, Receipt, Loader2 } from "lucide-react";
import { greeting } from "@/lib/format";
import { globalSearch, type GlobalSearchResults } from "@/app/(app)/search/actions";
import { ProfileMenu } from "./profile-menu";
import { HelpButton } from "./help-button";

const EMPTY_RESULTS: GlobalSearchResults = {
  customers: [],
  properties: [],
  jobs: [],
  quotes: [],
  invoices: [],
};

const GROUPS: { key: keyof GlobalSearchResults; label: string; icon: typeof Users }[] = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "invoices", label: "Invoices", icon: Receipt },
];

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function DashboardHeader({
  firstName,
  displayName,
  role,
}: {
  firstName: string;
  displayName: string;
  role: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against an older, slower request resolving after a newer one --
  // only the response matching the latest request is ever applied.
  const requestId = useRef(0);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      requestId.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale results when the query shrinks below the minimum length, a real reaction to query changing, not derivable during render
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    const thisRequestId = ++requestId.current;

    const timer = setTimeout(() => {
      globalSearch(trimmedQuery)
        .then((data) => {
          if (thisRequestId !== requestId.current) return;
          setResults(data);
          setLoading(false);
        })
        .catch(() => {
          if (thisRequestId !== requestId.current) return;
          setError(true);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (trimmedQuery) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  }

  const hasAnyResults = GROUPS.some((g) => results[g.key].length > 0);
  const showDropdown = open && trimmedQuery.length >= MIN_QUERY_LENGTH;

  return (
    <header className="flex flex-col gap-4 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 sm:py-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <div ref={containerRef} className="relative min-w-0 flex-1">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search jobs, customers, quotes..."
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
          </form>

          {showDropdown ? (
            <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {loading ? (
                <p className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </p>
              ) : error ? (
                <p className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  Search failed — try again.
                </p>
              ) : !hasAnyResults ? (
                <p className="px-4 py-3 text-sm text-neutral-500">
                  No results for &quot;{trimmedQuery}&quot;.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                  {GROUPS.map((group) => {
                    const items = results[group.key];
                    if (items.length === 0) return null;
                    const Icon = group.icon;
                    return (
                      <div key={group.key} className="py-2">
                        <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          {group.label}
                        </p>
                        {items.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-neutral-900 dark:text-neutral-50">
                                {item.label}
                              </span>
                              {item.sublabel ? (
                                <span className="block truncate text-xs text-neutral-500">
                                  {item.sublabel}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <HelpButton />
          <ProfileMenu displayName={displayName} role={role} />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl dark:text-neutral-50">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>
    </header>
  );
}
