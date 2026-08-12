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
    .select("full_name, email, role, business_id")
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
