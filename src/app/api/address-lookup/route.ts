import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GNAF-backed Australian address lookup, proxied server-side so the API key
// never reaches the browser. Two-step Geoscape Predictive Address pattern:
// a search call returns lightweight suggestions (id + label), a second
// by-id call resolves one to structured street/suburb/state/postcode
// fields.
//
// TODO(geoscape): the exact base URL, auth header shape, and response field
// names below are this integration's best-documented understanding at the
// time this was written, not independently verified against Geoscape's own
// docs (this sandbox can't reach hub.geoscape.com.au / developer.geoscape.
// com.au to confirm). If suggestions never show up once GEOSCAPE_API_KEY is
// set, check this against your actual Geoscape Hub API reference first --
// a wrong URL/field name here just fails closed (empty results), it can't
// corrupt data or crash the form.
const GEOSCAPE_BASE_URL = process.env.GEOSCAPE_API_BASE_URL || "https://api.geoscape.com.au/v1";

interface GeoscapeSearchResult {
  id: string;
  address: string;
}

interface GeoscapeAddressDetail {
  addressComponents?: {
    streetName?: string;
    streetTypeCode?: string;
    complexNumber?: string;
    complexNumberSuffix?: string;
    numberFirst?: string;
    numberFirstSuffix?: string;
    localityName?: string;
    stateTerritory?: string;
    postcode?: string;
  };
}

async function searchAddresses(query: string, apiKey: string): Promise<{ id: string; label: string }[]> {
  const res = await fetch(
    `${GEOSCAPE_BASE_URL}/predictive/address?query=${encodeURIComponent(query)}&country=AU`,
    { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { suggest?: GeoscapeSearchResult[] };
  return (data.suggest ?? []).map((r) => ({ id: r.id, label: r.address }));
}

async function resolveAddress(id: string, apiKey: string) {
  const res = await fetch(`${GEOSCAPE_BASE_URL}/predictive/address/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as GeoscapeAddressDetail;
  const c = data.addressComponents;
  if (!c) return null;

  const unitPrefix = c.complexNumber ? `${c.complexNumber}${c.complexNumberSuffix ?? ""}/` : "";
  const streetNumber = `${c.numberFirst ?? ""}${c.numberFirstSuffix ?? ""}`;
  const streetAddress = [unitPrefix + streetNumber, c.streetName, c.streetTypeCode]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    street_address: streetAddress,
    suburb: c.localityName ?? null,
    state: c.stateTerritory ?? null,
    postcode: c.postcode ?? null,
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
