import * as Sentry from "@sentry/nextjs";

// Loaded automatically by Next.js on the client. Covers errors that never
// reach the server at all (rendering/interaction bugs in the browser) --
// error.tsx's Sentry.captureException call is what actually reports the
// ones React's error boundary catches; this just makes sure the SDK is
// initialised before that ever fires.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
