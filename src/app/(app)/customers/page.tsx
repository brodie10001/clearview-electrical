import Link from "next/link";
import { Plus, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .order("name")
    .returns<CustomerRow[]>();

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Customers</h1>
        <Link
          href="/customers/new"
          className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          New Customer
        </Link>
      </div>

      {!customers || customers.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">No customers yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="flex items-center gap-3 bg-white px-4 py-3.5 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {customer.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {customer.name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {customer.phone || customer.email || "No contact info"}
                  </p>
                </div>
                <User className="h-4 w-4 shrink-0 text-neutral-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
