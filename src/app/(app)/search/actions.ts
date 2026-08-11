"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResultItem {
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
}

export interface GlobalSearchResults {
  customers: SearchResultItem[];
  properties: SearchResultItem[];
  jobs: SearchResultItem[];
  quotes: SearchResultItem[];
  invoices: SearchResultItem[];
}

const EMPTY_RESULTS: GlobalSearchResults = {
  customers: [],
  properties: [],
  jobs: [],
  quotes: [],
  invoices: [],
};

const RESULT_LIMIT = 6;

// Every query below goes through the same session-bound Supabase server
// client used everywhere else in the app, so RLS (business_id =
// current_business_id()) scopes every result exactly like any other page --
// there is no separate "search index" or client-side full-table fetch that
// could leak another business's records.
export async function globalSearch(rawQuery: string): Promise<GlobalSearchResults> {
  const query = rawQuery.trim();
  // Two characters minimum -- a single letter would match almost everything
  // and isn't worth a round trip.
  if (query.length < 2) return EMPTY_RESULTS;

  const supabase = await createClient();
  const pattern = `%${query}%`;

  const [customersRes, propertiesByAddressRes, quotesRes, invoicesRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone")
      .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .order("name")
      .limit(RESULT_LIMIT)
      .returns<{ id: string; name: string; email: string | null; phone: string | null }[]>(),
    supabase
      .from("properties")
      .select("id, address, customers(name)")
      .ilike("address", pattern)
      .limit(RESULT_LIMIT)
      .returns<{ id: string; address: string; customers: { name: string } | null }[]>(),
    supabase
      .from("quotes")
      .select("id, quote_number, total, jobs(properties(address, customers(name)))")
      .ilike("quote_number", pattern)
      .limit(RESULT_LIMIT)
      .returns<
        {
          id: string;
          quote_number: string;
          total: number;
          jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
        }[]
      >(),
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, jobs(properties(address, customers(name)))")
      .ilike("invoice_number", pattern)
      .limit(RESULT_LIMIT)
      .returns<
        {
          id: string;
          invoice_number: string;
          amount: number;
          jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
        }[]
      >(),
  ]);

  const matchedCustomerIds = (customersRes.data ?? []).map((c) => c.id);

  // A job has no searchable text of its own -- it matches when its property
  // address matches, or when it belongs to a customer that already matched
  // above. Fetching properties for the matched customers (rather than a
  // deep cross-table OR filter) keeps every step a plain, verifiable query.
  const propertiesByCustomerRes = matchedCustomerIds.length
    ? await supabase
        .from("properties")
        .select("id, address, customers(name)")
        .in("customer_id", matchedCustomerIds)
        .limit(RESULT_LIMIT * 2)
        .returns<{ id: string; address: string; customers: { name: string } | null }[]>()
    : { data: [] };

  const jobPropertyRows = [
    ...(propertiesByAddressRes.data ?? []),
    ...(propertiesByCustomerRes.data ?? []),
  ];
  const jobPropertyIds = Array.from(new Set(jobPropertyRows.map((p) => p.id)));

  const jobsRes = jobPropertyIds.length
    ? await supabase
        .from("jobs")
        .select("id, job_status, properties(address, customers(name))")
        .in("property_id", jobPropertyIds)
        .eq("archived", false)
        .limit(RESULT_LIMIT)
        .returns<
          {
            id: string;
            job_status: string;
            properties: { address: string; customers: { name: string } | null } | null;
          }[]
        >()
    : { data: [] };

  return {
    customers: (customersRes.data ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: [c.phone, c.email].filter(Boolean).join(" · ") || null,
      href: `/customers/${c.id}`,
    })),
    properties: (propertiesByAddressRes.data ?? []).map((p) => ({
      id: p.id,
      label: p.address,
      sublabel: p.customers?.name ?? null,
      href: `/properties/${p.id}`,
    })),
    jobs: (jobsRes.data ?? []).map((j) => ({
      id: j.id,
      label: j.properties?.address ?? "Unknown property",
      sublabel: [j.properties?.customers?.name, j.job_status].filter(Boolean).join(" · ") || null,
      href: `/jobs/${j.id}`,
    })),
    quotes: (quotesRes.data ?? []).map((q) => ({
      id: q.id,
      label: q.quote_number,
      sublabel: [q.jobs?.properties?.customers?.name, `$${q.total.toFixed(2)}`]
        .filter(Boolean)
        .join(" · "),
      href: `/quotes/${q.id}`,
    })),
    invoices: (invoicesRes.data ?? []).map((inv) => ({
      id: inv.id,
      label: inv.invoice_number,
      sublabel: [inv.jobs?.properties?.customers?.name, `$${inv.amount.toFixed(2)}`]
        .filter(Boolean)
        .join(" · "),
      href: `/invoices/${inv.id}`,
    })),
  };
}
