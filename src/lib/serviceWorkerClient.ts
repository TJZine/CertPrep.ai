import { logger } from "@/lib/logger";

const CACHE_CLEAR_MESSAGE = { type: "CLEAR_CACHES" } as const;

/**
 * Requests the active service worker (if any) to clear cached data.
 * Best-effort and safe to call in environments without SW support.
 */
export async function requestServiceWorkerCacheClear(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  let cacheClearRequested = false;
  const sendClearMessage = (
    target: ServiceWorker | null | undefined,
  ): void => {
    if (cacheClearRequested || !target) return;
    try {
      target.postMessage(CACHE_CLEAR_MESSAGE);
      cacheClearRequested = true;
    } catch (error) {
      logger.warn("Failed to post cache clear message to service worker", error);
    }
  };

  try {
    // Attempt immediately if we already have a controlling worker.
    sendClearMessage(navigator.serviceWorker.controller);

    // Also schedule a send once the service worker becomes ready; this resolves
    // even after slow cold-start installs without blocking the caller.
    void navigator.serviceWorker.ready
      .then((registration) => {
        sendClearMessage(registration?.active);
      })
      .catch((error) => {
        logger.warn("Failed waiting for service worker readiness", error);
      });
  } catch (error) {
    logger.warn("Failed to request service worker cache clear", error);
  }
}
