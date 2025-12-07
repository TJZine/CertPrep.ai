import React, { useState, useEffect, useMemo } from "react";

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
    console.warn("crypto.subtle not available for fallback hashing");
    return results;
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
): { resolvedAnswers: Record<string, string>; isResolving: boolean } {
  const [resolvedAnswers, setResolvedAnswers] = useState<
    Record<string, string>
  >({});
  const [isResolving, setIsResolving] = useState(false);

  // Keep track of resolved attempts to avoid re-work
  const resolvedRef = React.useRef<Set<string>>(new Set());

  // Stable worker reference
  const workerRef = React.useRef<Worker | null>(null);
  // Track if worker instantiation failed - using State to trigger effect re-run on failure
  const [workerFailed, setWorkerFailed] = useState(false);

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
    setWorkerFailed(false);
    let blobUrl: string | null = null;

    try {
      const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
      blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);
      workerRef.current = worker;

      // Handle worker-level errors (e.g., script load failures)
      worker.onerror = (event: ErrorEvent): void => {
        // Critical: Prevent error from bubbling to window/Sentry
        event.preventDefault();
        console.warn(
          "[useCorrectAnswer] Worker failed (likely load error), switching to fallback:",
          event.message,
        );
        // Kill the dead worker and signal failure state
        worker.terminate();
        workerRef.current = null;
        setWorkerFailed(true);
      };
    } catch (error) {
      console.warn("[useCorrectAnswer] Worker instantiation failed:", error);
      setWorkerFailed(true);
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

    const resolveAnswer = async (): Promise<void> => {
      const currentOptions = optionsRef.current;
      if (!questionId || !targetHash || !currentOptions) return;

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

      // STRATEGY: Fallback
      if (workerFailed || !workerRef.current) {
        try {
          const hashes = await hashOptionsFallback(currentOptions);
          processResult(hashes);
        } catch (error) {
          console.error("[useCorrectAnswer] Fallback hashing failed", error);
        } finally {
          if (isMounted) setIsResolving(false);
        }
        return;
      }

      // STRATEGY: Worker
      handler = (event: MessageEvent): void => {
        const { type, payload } = event.data;

        if (type === "hash_bulk_error" && payload.id === questionId) {
          console.error("Worker computation error:", payload.error);
          if (isMounted) setIsResolving(false);
          cleanup();
          return;
        }

        if (type === "hash_bulk_result" && payload.id === questionId) {
          processResult(payload.hashes as Record<string, string>);
          if (isMounted) setIsResolving(false);
          cleanup();
        }
      };

      const cleanup = (): void => {
        if (handler && workerRef.current) {
          workerRef.current.removeEventListener("message", handler);
        }
      };

      workerRef.current.addEventListener("message", handler);

      // Send work
      workerRef.current.postMessage({
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
      if (handler && workerRef.current) {
        workerRef.current.removeEventListener("message", handler);
      }
    };
  }, [questionId, targetHash, optionsKey, workerFailed]); // Depend on optionsKey to trigger when options load

  return { resolvedAnswers, isResolving };
}