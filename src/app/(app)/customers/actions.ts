"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PaymentTerms } from "@/types/database";

async function insertCustomer(formData: FormData) {
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

  return { id: data.id as string, name };
}

export async function createCustomer(formData: FormData) {
  const { id } = await insertCustomer(formData);
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export interface CreateCustomerInlineState {
  error: string | null;
  customer: { id: string; name: string } | null;
}

// Same insert as createCustomer, but for use inside a stacked dialog (e.g.
// "+ Create new customer" from the property-creation sheet): returns the
// new row instead of redirecting.
export async function createCustomerInline(
  _prevState: CreateCustomerInlineState,
  formData: FormData,
): Promise<CreateCustomerInlineState> {
  try {
    const customer = await insertCustomer(formData);
    revalidatePath("/customers");
    return { error: null, customer };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create customer",
      customer: null,
    };
  }
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const billingAddress = (formData.get("billing_address") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const paymentTerms = (formData.get("payment_terms") as PaymentTerms) || null;

  const supabase = await createClient();
  await supabase
    .from("customers")
    .update({
      name,
      email,
      phone,
      billing_address: billingAddress,
      notes,
      payment_terms: paymentTerms,
    })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}
