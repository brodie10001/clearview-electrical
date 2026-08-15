import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GNAF-backed Australian address lookup, proxied server-side so the API key
// never reaches the browser. Two-step Geoscape Predictive AV API (Predictive
// API v1, base api.psma.com.au) pattern, confirmed against Geoscape's own
// API reference (api-docs.geoscape.com.au):
//   GET /predictive/address?query=...   -> { suggest: [{ id, address, rank }] }
//   GET /predictive/address/{id}        -> { address: { id, properties: {...} } }
// Auth is a raw API key in the `Authorization` header -- no "Bearer" prefix,
// no OAuth token exchange (confirmed via the docs' own example:
// `Authorization: 123`).
const GEOSCAPE_BASE_URL = process.env.GEOSCAPE_API_BASE_URL || "https://api.psma.com.au/v1";

interface GeoscapeSuggestResult {
  id: string;
  address: string;
  rank: number;
}

// GNAF data comes back ALL CAPS (see docs' own example: "113 CANBERRA AV,
// GRIFFITH ACT 2603") -- these values get stored permanently and displayed
// everywhere the app already shows an address, so they're title-cased here
// once rather than shouting at every reader forever after.
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, boundary, letter) => boundary + letter.toUpperCase());
}

interface GeoscapeAddressDetail {
  address?: {
    id: string;
    properties?: {
      street_number_1?: string;
      street_name?: string;
      street_type_description?: string;
      locality_name?: string;
      state_territory?: string;
      postcode?: string;
    };
  };
}

async function searchAddresses(query: string, apiKey: string): Promise<{ id: string; label: string }[]> {
  const res = await fetch(`${GEOSCAPE_BASE_URL}/predictive/address?query=${encodeURIComponent(query)}`, {
    headers: { Authorization: apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { suggest?: GeoscapeSuggestResult[] };
  return (data.suggest ?? []).map((r) => ({ id: r.id, label: titleCase(r.address) }));
}

async function resolveAddress(id: string, apiKey: string) {
  const res = await fetch(`${GEOSCAPE_BASE_URL}/predictive/address/${encodeURIComponent(id)}`, {
    headers: { Authorization: apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as GeoscapeAddressDetail;
  const p = data.address?.properties;
  if (!p) return null;

  const streetAddress = [p.street_number_1, p.street_name, p.street_type_description]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    street_address: titleCase(streetAddress),
    suburb: p.locality_name ? titleCase(p.locality_name) : null,
    state: p.state_territory ?? null,
    postcode: p.postcode ?? null,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit("address-lookup", { maxRequests: 30, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const apiKey = process.env.GEOSCAPE_API_KEY;
  // No key configured -- fail closed to an empty result set rather than
  // erroring, so the address fields stay fully usable as plain manual
  // entry until a key is set.
  if (!apiKey) return NextResponse.json({ suggestions: [] });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  try {
    if (id) {
      const resolved = await resolveAddress(id, apiKey);
      if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(resolved);
    }

    if (query && query.trim().length >= 4) {
      const suggestions = await searchAddresses(query.trim(), apiKey);
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ suggestions: [] });
  } catch {
    // Network/timeout issues against the address API degrade to "no
    // suggestions" -- never a broken form.
    return NextResponse.json({ suggestions: [] });
  }
}
