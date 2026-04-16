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

    const loadReplay = (): void => {
      if (replayLoaded) {
        return;
      }
      replayLoaded = true;

      import("@sentry/nextjs")
        .then((SentryModule) => {
          const client = SentryModule.getClient();
          if (client) {
            client.addIntegration(
              SentryModule.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
              }),
            );
          }
        })
        .catch((error) => {
          void error;
        });
    };

    const interactionEvents: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const handleInteraction = (): void => {
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleInteraction),
      );
      loadReplay();
    };

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
