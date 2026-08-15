"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

interface Suggestion {
  id: string;
  label: string;
}

interface ResolvedAddress {
  street_address: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
}

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 4;

export interface PropertyAddressDefaults {
  street_address?: string;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
}

// Street address doubles as the autocomplete search box; suburb/state/
// postcode are separate, always-editable fields that a selected suggestion
// auto-fills. Manual entry/correction stays possible at every step -- this
// never requires the lookup API to succeed, it's a shortcut on top of plain
// text fields that were already there.
export function PropertyAddressFields({
  inputClass,
  labelClass,
  defaults,
}: {
  inputClass: string;
  labelClass: string;
  defaults?: PropertyAddressDefaults;
}) {
  const [street, setStreet] = useState(defaults?.street_address ?? "");
  const [suburb, setSuburb] = useState(defaults?.suburb ?? "");
  const [state, setState] = useState(defaults?.state ?? "");
  const [postcode, setPostcode] = useState(defaults?.postcode ?? "");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Selecting a suggestion fills `street` from the resolved address, which
  // would otherwise immediately re-trigger the search effect below --
  // suppress exactly one lookup after a programmatic fill.
  const skipNextLookup = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    const handle = setTimeout(async () => {
      if (street.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/address-lookup?q=${encodeURIComponent(street)}`);
        if (res.ok) {
          const data = (await res.json()) as { suggestions: Suggestion[] };
          setSuggestions(data.suggestions);
          setOpen(data.suggestions.length > 0);
        }
      } catch {
        // Lookup failing is never fatal -- the fields are still plain,
        // manually-editable inputs.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [street]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function selectSuggestion(s: Suggestion) {
    setOpen(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/address-lookup?id=${encodeURIComponent(s.id)}`);
      if (res.ok) {
        const resolved = (await res.json()) as ResolvedAddress;
        skipNextLookup.current = true;
        setStreet(resolved.street_address);
        setSuburb(resolved.suburb ?? "");
        setState(resolved.state ?? "");
        setPostcode(resolved.postcode ?? "");
      }
    } catch {
      // Fall through -- the suggestion just doesn't get applied; nothing
      // already typed is lost.
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative flex flex-col gap-1.5">
        <label className={labelClass}>Street address</label>
        <div className="relative">
          <input
            name="street_address"
            required
            autoComplete="off"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            className={`${inputClass} w-full pr-9`}
            placeholder="Start typing an address..."
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
          ) : null}
        </div>

        {open && suggestions.length > 0 ? (
          <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-neutral-500">
          Pick a suggestion to auto-fill the fields below, or just type the address in manually.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Suburb</label>
          <input
            name="suburb"
            value={suburb ?? ""}
            onChange={(e) => setSuburb(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Postcode</label>
          <input
            name="postcode"
            inputMode="numeric"
            maxLength={4}
            value={postcode ?? ""}
            onChange={(e) => setPostcode(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>State</label>
        <select
          name="state"
          value={state ?? ""}
          onChange={(e) => setState(e.target.value)}
          className={inputClass}
        >
          <option value="">Select a state...</option>
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
