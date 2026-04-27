// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { getClientSentryConfig } from "@/../sentry.client.config";

const clientSentryConfig = getClientSentryConfig();

if (clientSentryConfig.dsn && !Sentry.getClient()) {
  Sentry.init(clientSentryConfig);

  if (typeof window !== "undefined") {
    let replayLoaded = false;

    const interactionEvents: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "scroll",
      "touchstart",
    ];

    function removeInteractionListeners(): void {
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleInteraction),
      );
    }

    function loadReplay(): void {
      if (replayLoaded) {
        return;
      }
      replayLoaded = true;
      removeInteractionListeners();

      try {
        const client = Sentry.getClient();
        if (client) {
          client.addIntegration(
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          );
        }
      } catch (error) {
        console.warn("Failed to load Sentry replay integration", error);
      }
    }

    function handleInteraction(): void {
      loadReplay();
    }

    // Replay is deferred to reduce initial client work; this may miss very early
    // session replay context.

    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleInteraction, {
        once: true,
        passive: true,
      }),
    );

    setTimeout(loadReplay, 5000);
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
