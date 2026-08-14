import * as Sentry from "@sentry/nextjs";

// Registers Sentry for the server and edge runtimes. The client runtime is
// handled separately by instrumentation-client.ts, which Next.js loads
// automatically -- this file only covers what runs on the server.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

// Reports errors thrown inside Server Components/Actions that Next.js
// catches internally (and would otherwise never reach error.tsx's
// client-side Sentry.captureException call).
export const onRequestError = Sentry.captureRequestError;
