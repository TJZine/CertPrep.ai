"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { syncResults } from "@/lib/sync/syncManager";
import { syncQuizzes } from "@/lib/sync/quizSyncManager";
import { syncSRS } from "@/lib/sync/srsSyncManager";

import { getSyncBlockState } from "@/db/syncState";
import { logger } from "@/lib/logger";

export interface SyncBlockedInfo {
  reason: string;
  blockedAt: number;
  remainingMins: number;
  tables: Array<"results" | "quizzes" | "srs">;
}

export type SyncStatus = "success" | "partial" | "failed";

export interface SyncOutcome {
  status: SyncStatus;
  success: boolean; // derived: status === "success"
  error?: unknown;
  details?: { quizzes: boolean; results: boolean; srs: boolean }; // values = incomplete flags
}

interface SyncContextType {
  sync: () => Promise<SyncOutcome>;
  isSyncing: boolean;
  hasInitialSyncCompleted: boolean;
  initialSyncError: Error | null;
  syncBlocked: SyncBlockedInfo | null;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { user } = useAuth();
  const userId = user?.id;
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitialSyncCompleted, setHasInitialSyncCompleted] = useState(false);
  const [initialSyncError, setInitialSyncError] = useState<Error | null>(null);
  const [syncBlocked, setSyncBlocked] = useState<SyncBlockedInfo | null>(null);
  const initialSyncAttemptedRef = useRef<string | null>(null);
  // Ref-based debounce guard for synchronous protection against overlapping syncs
  const syncInProgressRef = useRef(false);

  // Refs for async guard pattern (prevents stale updates on user switch/unmount)
  const currentUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Track current user ID in ref for async guards
  useEffect((): void => {
    currentUserIdRef.current = userId ?? null;
  }, [userId]);

  // Unmount cleanup
  useEffect((): (() => void) => {
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      // Reset sync state when user logs out
      setHasInitialSyncCompleted(false);
      setInitialSyncError(null);
      initialSyncAttemptedRef.current = null;
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("cp_last_user_id", userId);
    }
  }, [userId]);

  // Compute SyncBlockedInfo from SyncBlockState
  const computeBlockedInfo = useCallback(async (): Promise<void> => {
    if (!userId) {
      setSyncBlocked(null);
      return;
    }

    // Capture activeUserId to detect race conditions/stale updates
    const activeUserId = userId;

    try {
      // Check all tables for blocks using allSettled
      const results = await Promise.allSettled([
        getSyncBlockState(userId, "results"),
        getSyncBlockState(userId, "quizzes"),
        getSyncBlockState(userId, "srs"),
      ]);

      // Guard: Abort if unmounted or user changed during async operation
      if (!isMountedRef.current) return;
      if (currentUserIdRef.current !== activeUserId) return;

      const [resultsResult, quizzesResult, srsResult] = results;

      const resultsBlock =
        resultsResult.status === "fulfilled" ? resultsResult.value : null;
      const quizzesBlock =
        quizzesResult.status === "fulfilled" ? quizzesResult.value : null;
      const srsBlock =
        srsResult.status === "fulfilled" ? srsResult.value : null;

      // Log any failures
      if (resultsResult.status === "rejected")
        logger.warn("Failed to check results block state", resultsResult.reason);
      if (quizzesResult.status === "rejected")
        logger.warn("Failed to check quizzes block state", quizzesResult.reason);
      if (srsResult.status === "rejected")
        logger.warn("Failed to check srs block state", srsResult.reason);

      // Collect which tables are blocked
      const tables: Array<"results" | "quizzes" | "srs"> = [];
      const blocks = [];

      if (resultsBlock) {
        tables.push("results");
        blocks.push(resultsBlock);
      }
      if (quizzesBlock) {
        tables.push("quizzes");
        blocks.push(quizzesBlock);
      }
      if (srsBlock) {
        tables.push("srs");
        blocks.push(srsBlock);
      }

      if (tables.length > 0) {
        // Calculate remainingMs for each block and find the dominant one (max remaining time)
        const now = Date.now();
        const blockDetails = blocks.map((b) => ({
          block: b,
          remainingMs: Math.max(0, b.ttlMs - (now - b.blockedAt)),
        }));

        // Sort by remainingMs descending
        blockDetails.sort((a, b) => b.remainingMs - a.remainingMs);

        const dominant = blockDetails[0];
        if (!dominant) return;
        const remainingMins = Math.ceil(dominant.remainingMs / 60_000);

        setSyncBlocked({
          reason: dominant.block.reason,
          blockedAt: dominant.block.blockedAt,
          remainingMins,
          tables,
        });
      } else {
        setSyncBlocked(null);
      }
    } catch (error) {
      // Should not happen with allSettled, but as a fallback
      logger.error("Unexpected error in computeBlockedInfo", error);
      // Do not update state on error to avoid flicker
    }
  }, [userId]);

  // Poll for block state changes
  useEffect(() => {
    if (!userId) return;
    void computeBlockedInfo();
    const interval = setInterval(() => void computeBlockedInfo(), 60_000);
    return (): void => clearInterval(interval);
  }, [userId, computeBlockedInfo]);

  const sync = useCallback(async (): Promise<SyncOutcome> => {
    if (userId) {
      // Step 1: Debounce guard — prevent overlapping sync calls (ref for sync check)
      if (syncInProgressRef.current) {
        logger.debug("[Sync] Sync already in progress, skipping");
        return { status: "partial", success: false, error: "Sync in progress" };
      }
      syncInProgressRef.current = true;

      setIsSyncing(true);
      const syncStart = performance.now();

      try {
        // Step 2: Run syncs in parallel instead of sequentially
        // Each sync manager has its own Web Lock, so they are safe to run concurrently
        const settlements = await Promise.allSettled([
          syncQuizzes(userId),
          syncResults(userId),
          syncSRS(userId),
        ]);

        // Extract outcomes, treating rejections as incomplete
        const outcomes = settlements.map(
          (s) => (s.status === "fulfilled" ? s.value : { incomplete: true })
        );
        const quizzesOutcome = outcomes[0] ?? { incomplete: true };
        const resultsOutcome = outcomes[1] ?? { incomplete: true };
        const srsOutcome = outcomes[2] ?? { incomplete: true };

        const anyIncomplete =
          quizzesOutcome.incomplete ||
          resultsOutcome.incomplete ||
          srsOutcome.incomplete;

        const status: SyncStatus = anyIncomplete ? "partial" : "success";

        // Refresh block info immediately after sync attempts (fire-and-forget; guards prevent stale updates)
        void computeBlockedInfo();

        // Step 3: Instrumentation — log sync duration
        const duration = performance.now() - syncStart;
        logger.info(`[Sync] Total sync completed in ${duration.toFixed(0)}ms`, {
          status,
          quizzes: quizzesOutcome.incomplete,
          results: resultsOutcome.incomplete,
          srs: srsOutcome.incomplete,
        });

        return {
          status,
          success: status === "success",
          details: {
            quizzes: quizzesOutcome.incomplete,
            results: resultsOutcome.incomplete,
            srs: srsOutcome.incomplete,
          },
        };
      } catch (error) {
        logger.error("Sync failed with exception", error);
        return {
          status: "failed",
          success: false,
          error,
        };
      } finally {
        syncInProgressRef.current = false;
        setIsSyncing(false);
      }
    }
    return {
      status: "failed",
      success: false,
      error: "No user",
    };
  }, [userId, computeBlockedInfo]);

  // Expose sync function for E2E testing
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      (
        window as Window & { __certprepSync?: () => Promise<void> }
      ).__certprepSync = async (): Promise<void> => {
        await sync();
      };
      return (): void => {
        delete (window as Window & { __certprepSync?: () => Promise<void> })
          .__certprepSync;
      };
    }
  }, [sync]);

  // Auto-sync on mount if user is logged in (handles page reloads/initial login)
  useEffect(() => {
    if (!userId) return;

    // Only run initial sync once per user session
    if (initialSyncAttemptedRef.current === userId) return;

    initialSyncAttemptedRef.current = userId;
    setHasInitialSyncCompleted(false);
    setInitialSyncError(null);

    let isMounted = true;

    const runInitialSync = async (): Promise<void> => {
      try {
        const result = await sync();

        if (isMounted) {
          if (result.status === "failed") {
            const err =
              result.error instanceof Error
                ? result.error
                : new Error(
                  result.error ? String(result.error) : "Initial sync failed",
                );
            setInitialSyncError(err);
          } else if (result.status === "partial") {
            // Partial sync is acceptable for initial load, just log it
            logger.info("Initial sync completed partially", result.details);
          }
        }
      } catch (error) {
        logger.error("Initial sync failed:", error);
        if (isMounted) {
          setInitialSyncError(
            error instanceof Error ? error : new Error("Initial sync failed"),
          );
        }
      } finally {
        if (isMounted) {
          setHasInitialSyncCompleted(true);
        }
      }
    };

    void runInitialSync();

    return (): void => {
      isMounted = false;
    };
  }, [userId, sync]);

  return (
    <SyncContext.Provider
      value={{
        sync,
        isSyncing,
        hasInitialSyncCompleted,
        initialSyncError,
        syncBlocked,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext(): SyncContextType {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
