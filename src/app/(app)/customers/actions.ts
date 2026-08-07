"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const billingAddress = (formData.get("billing_address") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ name, email, phone, billing_address: billingAddress, notes })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create customer");
  }

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const billingAddress = (formData.get("billing_address") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const supabase = await createClient();
  await supabase
    .from("customers")
    .update({ name, email, phone, billing_address: billingAddress, notes })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}
