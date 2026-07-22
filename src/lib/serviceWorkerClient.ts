import { logger } from "@/lib/logger";

const CACHE_CLEAR_MESSAGE = { type: "CLEAR_CACHES" } as const;
const CACHE_CLEAR_TIMEOUT_MS = 2_000;

export type CacheClearResult =
  | { status: "cleared" }
  | { status: "unsupported" }
  | { status: "no-active-worker" }
  | { status: "timeout" }
  | { status: "failed" };

/**
 * Requests runtime-cache deletion and resolves only after the active service
 * worker acknowledges completion or the bounded deadline expires.
 */
export async function requestServiceWorkerCacheClear(): Promise<CacheClearResult> {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof MessageChannel === "undefined"
  ) {
    return { status: "unsupported" };
  }

  return new Promise<CacheClearResult>((resolve) => {
    let settled = false;
    let responsePort: MessagePort | null = null;

    const finish = (result: CacheClearResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      responsePort?.close();
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      finish({ status: "timeout" });
    }, CACHE_CLEAR_TIMEOUT_MS);

    void (async (): Promise<void> => {
      try {
        const target =
          navigator.serviceWorker.controller ??
          (await navigator.serviceWorker.ready)?.active;

        if (settled) return;
        if (!target) {
          finish({ status: "no-active-worker" });
          return;
        }

        const channel = new MessageChannel();
        responsePort = channel.port1;
        responsePort.onmessage = (event: MessageEvent<unknown>): void => {
          const response = event.data as { ok?: unknown } | null;
          finish(
            response?.ok === true
              ? { status: "cleared" }
              : { status: "failed" },
          );
        };
        responsePort.onmessageerror = (): void => {
          finish({ status: "failed" });
        };

        target.postMessage(CACHE_CLEAR_MESSAGE, [channel.port2]);
      } catch (error) {
        logger.warn("Failed to clear service worker runtime cache", error);
        finish({ status: "failed" });
      }
    })();
  });
}
