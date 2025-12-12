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
import { getSyncBlockState } from "@/db/syncState";
import { logger } from "@/lib/logger";

export interface SyncBlockedInfo {
  reason: string;
  blockedAt: number;
  remainingMins: number;
  tables: Array<"results" | "quizzes">;
}

interface SyncContextType {
  sync: () => Promise<{ success: boolean; error?: unknown }>;
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
  const computeBlockedInfo = useCallback(
    async (): Promise<void> => {
      if (!userId) {
        setSyncBlocked(null);
        return;
      }
      // Check both tables for blocks
      const [resultsBlock, quizzesBlock] = await Promise.all([
        getSyncBlockState(userId, "results"),
        getSyncBlockState(userId, "quizzes"),
      ]);

      // Collect which tables are blocked
      const tables: Array<"results" | "quizzes"> = [];
      if (resultsBlock) tables.push("results");
      if (quizzesBlock) tables.push("quizzes");

      // Use first block found for timing info
      const block = resultsBlock ?? quizzesBlock;
      if (block && tables.length > 0) {
        const remainingMs = Math.max(0, block.ttlMs - (Date.now() - block.blockedAt));
        const remainingMins = Math.ceil(remainingMs / 60_000);
        setSyncBlocked({
          reason: block.reason,
          blockedAt: block.blockedAt,
          remainingMins,
          tables,
        });
      } else {
        setSyncBlocked(null);
      }
    },
    [userId],
  );

  // Poll for block state changes
  useEffect(() => {
    if (!userId) return;
    void computeBlockedInfo();
    const interval = setInterval(() => void computeBlockedInfo(), 60_000);
    return (): void => clearInterval(interval);
  }, [userId, computeBlockedInfo]);

  const sync = useCallback(async (): Promise<{
    success: boolean;
    error?: unknown;
  }> => {
    if (userId) {
      setIsSyncing(true);
      try {
        await syncQuizzes(userId);
        await syncResults(userId);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      } finally {
        setIsSyncing(false);
      }
    }
    return { success: false, error: "No user" };
  }, [userId]);

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

        if (isMounted && !result.success) {
          const err =
            result.error instanceof Error
              ? result.error
              : new Error(
                result.error ? String(result.error) : "Initial sync failed",
              );
          setInitialSyncError(err);
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
      value={{ sync, isSyncing, hasInitialSyncCompleted, initialSyncError, syncBlocked }}
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
