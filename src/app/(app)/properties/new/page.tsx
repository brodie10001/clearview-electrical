import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "@/components/property-form";

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

      <PropertyForm mode="page" customers={customers ?? []} defaultCustomerId={defaultCustomerId} />
    </div>
  );
}
