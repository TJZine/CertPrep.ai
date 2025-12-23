// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Check if Sentry is already initialized to prevent "Multiple Sentry Session Replay instances" error
// which can happen in React Strict Mode (double useEffect) or if Next.js auto-loads this file.
if (dsn && !Sentry.getClient()) {
  Sentry.init({
    dsn,

    // Integrations: Start with empty array to reduce initial bundle size.
    // Replay is lazy-loaded below after first user interaction.
    integrations: [],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Define how likely Replay events are sampled.
    // Sample 100% in development for debugging, reduce in production for cost control.
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

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
              /\b(password|secret|key|token|auth)\b[=:\s]+([^\s,;]+)/gi,
              "$1=[REDACTED]",
            );
          }
        });
      }

      if (event.message) {
        event.message = event.message.replace(
          /\b(password|secret|key|token|auth)\b[=:\s]+([^\s,;]+)/gi,
          "$1=[REDACTED]",
        );
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

  // Lazy-load Sentry Replay after first user interaction or timeout
  // This removes ~150KB from the critical path while still capturing replays
  // for meaningful user sessions. Early page load (first 5s) is not recorded,
  // but errors during this period are still captured.
  if (typeof window !== "undefined") {
    let replayLoaded = false;

    const loadReplay = (): void => {
      if (replayLoaded) return;
      replayLoaded = true;

      // Dynamic import to load replay chunk on demand
      import("@sentry/nextjs").then((SentryModule) => {
        const client = SentryModule.getClient();
        if (client) {
          client.addIntegration(
            SentryModule.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          );
        }
      }).catch((error) => {
        console.warn("[Sentry] Failed to lazy-load Replay integration:", error);
      });
    };

    // Trigger replay load on first meaningful interaction
    const interactionEvents: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const handleInteraction = (): void => {
      interactionEvents.forEach((event) =>
        window.removeEventListener(event, handleInteraction),
      );
      loadReplay();
    };

    interactionEvents.forEach((event) =>
      window.addEventListener(event, handleInteraction, {
        once: true,
        passive: true,
      }),
    );

    // Also load after 5s timeout as fallback for passive viewers
    setTimeout(loadReplay, 5000);
  }
}
