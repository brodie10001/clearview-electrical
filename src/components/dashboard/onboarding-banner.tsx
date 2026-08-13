"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

const DISMISSED_KEY = "ralden:onboarding-banner-dismissed";

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}
function dismiss() {
  localStorage.setItem(DISMISSED_KEY, "1");
  listeners.forEach((listener) => listener());
}
// SSR has no localStorage -- default to "dismissed" there so the server
// render matches the common case (nothing shown) and useSyncExternalStore
// reconciles with the real client value right after hydration, the
// documented way to read browser-only state without a manual effect.
function getServerSnapshot() {
  return true;
}

// This only renders when the Dashboard already knows onboarding_completed_at
// is still null -- localStorage here only remembers "the user asked not to
// see this again this device", not onboarding status itself.
export function OnboardingBanner() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-0 flex-1 text-amber-900 dark:text-amber-200">
        <span className="font-medium">Complete your business setup</span> to configure branding,
        pricing, and payment details.
      </p>
      <Link
        href="/onboarding"
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
      >
        Continue setup
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
