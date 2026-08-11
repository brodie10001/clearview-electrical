import Link from "next/link";
import { Users, Building2, Briefcase, FileText, Receipt } from "lucide-react";
import { globalSearch } from "./actions";

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const results = query
    ? await globalSearch(query)
    : { customers: [], properties: [], jobs: [], quotes: [], invoices: [] };

  const noResults =
    query &&
    !results.customers.length &&
    !results.properties.length &&
    !results.jobs.length &&
    !results.quotes.length &&
    !results.invoices.length;

  const groups = [
    { key: "customers" as const, label: "Customers", icon: Users },
    { key: "properties" as const, label: "Properties", icon: Building2 },
    { key: "jobs" as const, label: "Jobs", icon: Briefcase },
    { key: "quotes" as const, label: "Quotes", icon: FileText },
    { key: "invoices" as const, label: "Invoices", icon: Receipt },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        {query ? `Results for "${query}"` : "Search"}
      </h1>

      {!query ? (
        <p className="text-sm text-neutral-500">
          Use the search bar on the Dashboard to find customers, properties, jobs, quotes, or
          invoices.
        </p>
      ) : null}

      {noResults ? <p className="text-sm text-neutral-500">No matches found.</p> : null}

      {groups.map((group) => {
        const items = results[group.key];
        if (items.length === 0) return null;
        const Icon = group.icon;
        return (
          <section key={group.key}>
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <Icon className="h-3.5 w-3.5" /> {group.label}
            </h2>
            <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block bg-white px-4 py-3 text-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  >
                    <p className="font-medium text-neutral-900 dark:text-neutral-50">
                      {item.label}
                    </p>
                    {item.sublabel ? (
                      <p className="text-xs text-neutral-500">{item.sublabel}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
