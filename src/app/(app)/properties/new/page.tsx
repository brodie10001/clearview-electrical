import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProperty } from "../actions";

export default async function NewPropertyPage({ searchParams }: PageProps<"/properties/new">) {
  const { customer_id: customerIdParam } = await searchParams;
  const defaultCustomerId = typeof customerIdParam === "string" ? customerIdParam : "";

  const supabase = await createClient();
  const { data: customers } = await supabase.from("customers").select("id, name").order("name");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        New Property
      </h1>

      <form action={createProperty} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Customer
          </label>
          <select
            name="customer_id"
            required
            defaultValue={defaultCustomerId}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            <option value="" disabled>
              Select a customer...
            </option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            Don&apos;t see them?{" "}
            <Link href="/customers/new" className="text-amber-600 hover:underline">
              Add a new customer
            </Link>{" "}
            first.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Address
          </label>
          <input
            name="address"
            required
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Property type
          </label>
          <select
            name="property_type"
            required
            defaultValue="residential"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              GPS latitude (optional)
            </label>
            <input
              name="gps_lat"
              type="number"
              step="any"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              GPS longitude (optional)
            </label>
            <input
              name="gps_lng"
              type="number"
              step="any"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Create property
        </button>
      </form>
    </div>
  );
}
