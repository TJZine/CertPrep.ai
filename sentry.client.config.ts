// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Check if Sentry is already initialized to prevent "Multiple Sentry Session Replay instances" error
// which can happen in React Strict Mode (double useEffect) or if Next.js auto-loads this file.
if (!Sentry.getClient()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Add optional integrations for additional features
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === "development",

    beforeSend(event) {
      // Scrub Exception Messages for secrets
      if (event.exception?.values) {
        event.exception.values.forEach((exception) => {
          if (exception.value) {
            exception.value = exception.value.replace(
              /(password|secret|key|token|auth)[=:\s]+([^\s,;]+)/gi,
              "$1=[REDACTED]",
            );
          }
        });
      }

      // Drop noisy dev-only worker import failures (e.g., Turbopack/HMR invalidating worker chunks)
      if (process.env.NODE_ENV === "development") {
        const message = event.exception?.values?.[0]?.value ?? event.message;
        if (
          message?.includes("importScripts") &&
          message.includes("WorkerGlobalScope")
        ) {
          // Uncomment for local debugging if you want to see when we drop these noisy dev-only worker import errors.
          // console.debug("[Sentry] Dropped dev-only worker import failure");
          return null;
        }
      }
      return event;
    },
  });
}
