import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerInfoForm } from "./customer-info-form";
import type { PropertyType } from "@/types/database";

interface PropertyRow {
  id: string;
  address: string;
  property_type: PropertyType;
  status: string;
}

export default async function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [customerRes, propertiesRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, billing_address, notes, payment_terms")
      .eq("id", id)
      .single(),
    supabase
      .from("properties")
      .select("id, address, property_type, status")
      .eq("customer_id", id)
      .order("address")
      .returns<PropertyRow[]>(),
  ]);

  if (customerRes.error || !customerRes.data) notFound();
  const customer = customerRes.data;
  const properties = propertiesRes.data ?? [];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          {customer.name}
        </h1>
        <p className="text-xs text-neutral-500">
          {properties.length} {properties.length === 1 ? "property" : "properties"}
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Customer info
        </h2>
        <CustomerInfoForm customer={customer} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Properties
          </h2>
          <Link
            href={`/properties/new?customer_id=${customer.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add property
          </Link>
        </div>
        {properties.length === 0 ? (
          <p className="text-sm text-neutral-500">No properties linked to this customer yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {properties.map((property) => (
              <li key={property.id}>
                <Link
                  href={`/properties/${property.id}`}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {property.address}
                    </p>
                    <p className="truncate text-xs capitalize text-neutral-500">
                      {property.property_type}
                      {property.status === "archived" ? " · Archived" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
