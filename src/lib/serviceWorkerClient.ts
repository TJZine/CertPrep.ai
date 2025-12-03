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

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage(CACHE_CLEAR_MESSAGE);
  } catch (error) {
    logger.warn("Failed to request service worker cache clear", error);
  }
}
