import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Source map upload (readable production stack traces in Sentry) needs an
// org/project slug + auth token, none of which are set up yet -- the plugin
// just skips that step without failing the build when they're absent. Error
// reporting itself only needs the DSN (see instrumentation.ts /
// instrumentation-client.ts) and works regardless.
export default withSentryConfig(nextConfig, {
  silent: true,
});
