import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The app layout, dashboard, and quote detail page all separately fetched
// the current user's profile and business_settings/businesses display name
// on every navigation, even though this data rarely changes within a
// session. React's cache() memoizes a call per request (via
// AsyncLocalStorage), so the same query fired from multiple Server
// Components in one render tree hits Postgres once, not once per caller.

export const getCurrentProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email, role, business_id, tour_completed_at")
    .eq("id", userId)
    .single();
  return data;
});

export const getCurrentBusinessOverview = cache(async () => {
  const supabase = await createClient();
  const [settingsRes, businessRes] = await Promise.all([
    supabase.from("business_settings").select("trading_name").maybeSingle(),
    supabase.from("businesses").select("name, onboarding_completed_at").maybeSingle(),
  ]);
  return {
    tradingName: settingsRes.data?.trading_name ?? null,
    businessName: businessRes.data?.name ?? null,
    onboardingCompletedAt: businessRes.data?.onboarding_completed_at ?? null,
  };
});

// Cheap head-count for the sidebar/bottom-nav "Dashboard" badge -- overdue
// invoices + quotes still awaiting a customer reply, the same two
// highest-priority kinds of thing the dashboard's Needs Attention widget
// leads with. Both hit existing indexes (invoices_business_status_idx,
// quotes_business_status_updated_idx). RLS already scopes invoices/quotes
// to owners/admins, so this naturally comes back 0 for a technician rather
// than needing a separate role check here.
export const getAttentionCount = cache(async () => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [overdueRes, sentQuotesRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .lt("due_date", today)
      .not("status", "in", '("Paid","Void","Written Off")'),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "Sent"),
  ]);
  return (overdueRes.count ?? 0) + (sentQuotesRes.count ?? 0);
});
