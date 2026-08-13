"use server";

import { createServiceClient } from "@/lib/supabase/service";

// Called from the public invoice page's Accept/Decline buttons. Uses the
// service client since an anonymous visitor has no Supabase auth session --
// the token is the only thing authorizing this write, and it only ever
// touches the one invoice that token resolves to.
//
// This deliberately only ever writes customer_response/customer_response_at
// -- never invoices.status, never a payments row. A customer clicking
// "Accept" means they've seen and acknowledged the invoice, not that money
// has arrived; the business still records the actual payment themselves
// once it genuinely has.
export async function respondToInvoice(
  token: string,
  response: "Accepted" | "Declined",
): Promise<{ ok: boolean }> {
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("invoice_public_tokens")
    .select("invoice_id")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) return { ok: false };

  const { error } = await supabase
    .from("invoices")
    .update({ customer_response: response, customer_response_at: new Date().toISOString() })
    .eq("id", tokenRow.invoice_id);

  return { ok: !error };
}
