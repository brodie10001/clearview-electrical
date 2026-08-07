import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users, Building2, Briefcase } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const supabase = await createClient();

  const [customers, properties, jobs] = query
    ? await Promise.all([
        supabase
          .from("customers")
          .select("id, name, email")
          .ilike("name", `%${query}%`)
          .limit(10),
        supabase
          .from("properties")
          .select("id, address")
          .ilike("address", `%${query}%`)
          .limit(10),
        supabase
          .from("jobs")
          .select("id, job_status, properties!inner(address)")
          .ilike("properties.address", `%${query}%`)
          .limit(10)
          .returns<{ id: string; job_status: string; properties: { address: string } | null }[]>(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const jobMatches = jobs.data ?? [];

  const noResults =
    query && !customers.data?.length && !properties.data?.length && !jobMatches.length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        {query ? `Results for "${query}"` : "Search"}
      </h1>

      {!query ? (
        <p className="text-sm text-neutral-500">
          Use the search bar on the Dashboard to find customers, properties, or jobs.
        </p>
      ) : null}

      {noResults ? <p className="text-sm text-neutral-500">No matches found.</p> : null}

      {customers.data && customers.data.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <Users className="h-3.5 w-3.5" /> Customers
          </h2>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {customers.data.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/customers/${c.id}`}
                  className="block bg-white px-4 py-3 text-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  <p className="font-medium text-neutral-900 dark:text-neutral-50">{c.name}</p>
                  {c.email ? <p className="text-xs text-neutral-500">{c.email}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {properties.data && properties.data.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <Building2 className="h-3.5 w-3.5" /> Properties
          </h2>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {properties.data.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/properties/${p.id}`}
                  className="block bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
                >
                  {p.address}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {jobMatches.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <Briefcase className="h-3.5 w-3.5" /> Jobs
          </h2>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {jobMatches.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="block bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
                >
                  {j.properties?.address ?? "Unknown property"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
