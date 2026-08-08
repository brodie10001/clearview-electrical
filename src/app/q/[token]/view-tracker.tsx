"use client";

import { useEffect } from "react";
import { logQuoteViewed } from "../actions";

// Logs a "Viewed" activity event at most once per browser session (tracked
// via sessionStorage, not a cookie, so it never needs to be written from a
// Server Component render).
export function ViewTracker({ token }: { token: string }) {
  useEffect(() => {
    const key = `quote-viewed-${token}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    logQuoteViewed(token);
  }, [token]);

  return null;
}
