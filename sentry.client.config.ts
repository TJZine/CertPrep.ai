// This file defines the client-side Sentry options.
// Initialization is owned by src/instrumentation-client.ts.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SECRET_PATTERN = /\b(password|secret|key|token|auth)\b[=:\s]+([^\s,;]+)/gi;

function redactSecretLikeValues(value: string): string {
  return value.replace(SECRET_PATTERN, "$1=[REDACTED]");
}

export function getClientSentryConfig(): Parameters<typeof Sentry.init>[0] {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Replay is added after first interaction from instrumentation-client.ts
    // to keep the critical path smaller without changing sampling behavior.
    integrations: [],

    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enableLogs: true,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    debug: process.env.NODE_ENV === "development",

    beforeSend(event): typeof event | null {
      if (event.exception?.values) {
        event.exception.values.forEach((exception) => {
          if (exception.value) {
            exception.value = redactSecretLikeValues(exception.value);
          }
        });
      }

      if (event.message) {
        event.message = redactSecretLikeValues(event.message);
      }

      if (process.env.NODE_ENV === "development") {
        const message = event.exception?.values?.[0]?.value ?? event.message;
        if (
          message?.includes("importScripts") &&
          message.includes("WorkerGlobalScope")
        ) {
          return null;
        }
      }

      return event;
    },
  };
}
