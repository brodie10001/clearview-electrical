import { createClient } from "@/lib/supabase/server";
import { NewJobForm } from "./new-job-form";

export default async function NewJobPage({ searchParams }: PageProps<"/jobs/new">) {
  const { property_id: propertyId } = await searchParams;
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, customers(name)")
    .eq("status", "active")
    .order("address")
    .returns<{ id: string; address: string; customers: { name: string } | null }[]>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">New Job</h1>
      <NewJobForm
        properties={properties ?? []}
        defaultPropertyId={typeof propertyId === "string" ? propertyId : undefined}
      />
    </div>
  );
}
