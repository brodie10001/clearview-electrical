"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline caching is a nice-to-have; ignore registration failures.
      });
      return;
    }

    // A service worker must never run against `next dev`: its cache-first
    // strategy for /_next/static/ would keep serving JS chunks from a prior
    // Turbopack session after every restart, breaking client-side
    // navigation with no visible error. Actively clean up any registration
    // (and its caches) left over from before this guard existed.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }, []);

  return null;
}
