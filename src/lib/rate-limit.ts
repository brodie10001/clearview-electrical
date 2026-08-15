import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}

// Cheap, Postgres-backed rate limiter for the small set of endpoints an
// anonymous visitor can reach with no Supabase auth session at all -- the
// public invoice/quote pages' accept/decline actions and PDF downloads.
// Keyed by IP + route, so a single visitor/attacker can't hammer one of
// these regardless of which token they're trying against it.
export async function checkRateLimit(
  route: string,
  { maxRequests, windowSeconds }: { maxRequests: number; windowSeconds: number },
): Promise<boolean> {
  const ip = await getClientIp();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: `${route}:${ip}`,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  // Fail open: an infrastructure hiccup in the rate-limit check itself
  // shouldn't block a real customer from accepting an invoice.
  if (error) return true;
  return data === true;
}
