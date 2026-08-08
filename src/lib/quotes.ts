import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// A job can have at most one Accepted quote (enforced by
// quotes_one_accepted_per_job_idx), so this is the single source of truth
// for finding it -- both invoice creation and the job billing summary go
// through here rather than each running their own query/selection logic.
export async function getAcceptedQuote(supabase: SupabaseServerClient, jobId: string) {
  const { data } = await supabase
    .from("quotes")
    .select("id, quote_number, total")
    .eq("job_id", jobId)
    .eq("status", "Accepted")
    .maybeSingle();

  return data;
}
