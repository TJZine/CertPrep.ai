import React, { useState, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";

// Inline worker code to avoid network/bundler issues with importScripts/chunks
const WORKER_CODE = `
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "hash_bulk") {
    const { id, options } = payload;
    const results = {};

    try {
      const encoder = new TextEncoder();
      const keys = Object.keys(options);

      for (const key of keys) {
        const msgBuffer = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        results[key] = hashHex;
      }

      self.postMessage({
        type: "hash_bulk_result",
        payload: {
          id,
          hashes: results,
        },
      });
    } catch (error) {
      self.postMessage({
        type: "hash_bulk_error",
        payload: {
          id,
          error: error.message || "Unknown worker error",
        },
      });
    }
  }
};
`;

// Fallback logic extracted from worker to ensure robustness
async function hashOptionsFallback(
  options: Record<string, string>,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("SubtleCrypto is not available for fallback hashing.");
  }

  const encoder = new TextEncoder();
  // Sequential fallback is fine for main thread as N is small (4-5 options)
  for (const key of Object.keys(options)) {
    const msgBuffer = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    results[key] = hashHex;
  }
  return results;
}

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 * Tries to use a Web Worker (inline), but gracefully falls back to main thread if the worker fails.
 */
export function useCorrectAnswer(
  questionId: string | null,
  targetHash: string | null,
  options?: Record<string, string>,
): {
  resolvedAnswers: Record<string, string>;
  isResolving: boolean;
  error: string | null;
} {
  const [resolvedAnswers, setResolvedAnswers] = useState<
    Record<string, string>
  >({});
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of resolved attempts to avoid re-work
  const resolvedRef = React.useRef<Set<string>>(new Set());

  // Stable worker reference
  const workerRef = React.useRef<Worker | null>(null);
  const workerFailedRef = React.useRef(false);

  // Preserve latest options without re-running the effect on unstable object identity
  const optionsRef = React.useRef<Record<string, string> | undefined>(options);

  // Memoize options key to prevent effect re-runs on unstable object references
  const optionsKey = useMemo(() => {
    return options ? JSON.stringify(Object.keys(options).sort()) : "";
  }, [options]);

  useEffect(() => {
    optionsRef.current = options;
  }, [optionsKey, options]);

  // Worker Lifecycle Management
  useEffect((): (() => void) => {
    let blobUrl: string | null = null;

    try {
      const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
      blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);
      workerRef.current = worker;

      // Handle worker-level errors (e.g., script load failures)
      worker.onerror = (event: ErrorEvent): void => {
        // Prevent error from bubbling to window/Sentry; we'll surface it via hook state.
        event.preventDefault();
        logger.warn("[useCorrectAnswer] Worker failed, switching to fallback", {
          message: event.message,
        });
        workerFailedRef.current = true;
        setError("Answer hashing worker failed; using fallback.");
        // Kill the dead worker and signal failure state
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      logger.warn("[useCorrectAnswer] Worker instantiation failed", error);
      workerFailedRef.current = true;
    }

    return (): void => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (workerRef.current) {
        workerRef.current.onerror = null;
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Resolution Logic
  useEffect((): (() => void) => {
    let isMounted = true;
    let handler: ((event: MessageEvent) => void) | null = null;
    let cleanup: () => void = () => {
      // placeholder until request-specific handlers are wired
    };

    const resolveAnswer = async (): Promise<void> => {
      const currentOptions = optionsRef.current;
      if (!questionId || !targetHash || !currentOptions) return;

      setError(null);
      const cacheKey = `${questionId}:${targetHash}`;
      if (resolvedRef.current.has(cacheKey)) return;

      setIsResolving(true);

      const processResult = (hashes: Record<string, string>): void => {
        const match = Object.entries(hashes).find(
          (entry) => entry[1] === targetHash,
        );

        if (match) {
          const [correctOptionKey] = match;
          if (isMounted) {
            setResolvedAnswers((prev) => ({
              ...prev,
              [questionId]: correctOptionKey,
            }));
          }
          resolvedRef.current.add(cacheKey);
        }
      };

      const resolveWithFallback = async (
        valuesToHash: Record<string, string>,
      ): Promise<void> => {
        try {
          const hashes = await hashOptionsFallback(valuesToHash);
          processResult(hashes);
          if (isMounted) setError(null);
        } catch (error) {
          logger.error("[useCorrectAnswer] Fallback hashing failed", error);
          if (isMounted) {
            setError(
              error instanceof Error
                ? error.message
                : "Fallback hashing failed.",
            );
          }
        } finally {
          if (isMounted) setIsResolving(false);
        }
      };

      // STRATEGY: Fallback
      if (workerFailedRef.current || !workerRef.current) {
        await resolveWithFallback(currentOptions);
        return;
      }

      const workerForRequest = workerRef.current;
      const previousOnError = workerForRequest.onerror;
      let activeOnError: ((event: ErrorEvent) => void) | null = null;
      let hasFallbacked = false;

      cleanup = (): void => {
        if (handler && workerForRequest) {
          workerForRequest.removeEventListener("message", handler);
        }
        if (workerForRequest.onerror === activeOnError) {
          workerForRequest.onerror = previousOnError;
        }
      };

      const fallbackWithWorkerError = (): void => {
        if (hasFallbacked) return;
        hasFallbacked = true;
        logger.warn("[useCorrectAnswer] Worker failed during answer resolution", {
          questionId,
        });
        workerFailedRef.current = true;

        if (isMounted) {
          setError("Answer hashing worker failed; using fallback.");
        }

        cleanup();

        workerForRequest.terminate();
        if (workerRef.current === workerForRequest) {
          workerRef.current = null;
        }

        void resolveWithFallback(currentOptions);
      };

      // STRATEGY: Worker
      handler = (event: MessageEvent): void => {
        const { type, payload } = event.data;
        const isMessageForFallback =
          payload?.id === questionId || payload?.id == null;
        if (
          (type === "hash_bulk_error" || type === "ERROR") &&
          isMessageForFallback
        ) {
          logger.warn("[useCorrectAnswer] Worker computation error", {
            error: payload?.error ?? "unknown worker error",
          });
          fallbackWithWorkerError();
          return;
        }

        if (type === "hash_bulk_result" && payload?.id === questionId) {
          hasFallbacked = true;
          processResult(payload.hashes as Record<string, string>);
          if (isMounted) setIsResolving(false);
          cleanup();
        }
      };

      activeOnError = (event: ErrorEvent): void => {
        event.preventDefault();

        logger.warn("[useCorrectAnswer] Worker failed during answer resolution", {
          message: event.message,
          questionId,
        });
        fallbackWithWorkerError();
      };

      workerForRequest.onerror = activeOnError;
      workerForRequest.addEventListener("message", handler);

      // Send work
      workerForRequest.postMessage({
        type: "hash_bulk",
        payload: {
          id: questionId,
          options: currentOptions,
        },
      });
    };

    void resolveAnswer();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [questionId, targetHash, optionsKey]); // Depend on optionsKey to trigger when options load

  return { resolvedAnswers, isResolving, error };
}
