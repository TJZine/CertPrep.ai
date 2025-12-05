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

interface SyncContextType {
  sync: () => Promise<void>;
  isSyncing: boolean;
  hasInitialSyncCompleted: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { user } = useAuth();
  const userId = user?.id;
  const lastUserIdRef = useRef<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitialSyncCompleted, setHasInitialSyncCompleted] = useState(false);
  const initialSyncAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      // Reset sync state when user logs out
      setHasInitialSyncCompleted(false);
      initialSyncAttemptedRef.current = null;
      return;
    }
    lastUserIdRef.current = userId;
    if (typeof window !== "undefined") {
      localStorage.setItem("cp_last_user_id", userId);
    }
  }, [userId]);

  const sync = useCallback(async () => {
    if (userId) {
      setIsSyncing(true);
      try {
        await syncQuizzes(userId);
        await syncResults(userId);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [userId]);

  // Expose sync function for E2E testing
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      (
        window as Window & { __certprepSync?: () => Promise<void> }
      ).__certprepSync = sync;
    }
  }, [sync]);

  // Auto-sync on mount if user is logged in (handles page reloads/initial login)
  useEffect(() => {
    if (!userId) return;

    // Only run initial sync once per user session
    if (initialSyncAttemptedRef.current === userId) return;

    initialSyncAttemptedRef.current = userId;
    setHasInitialSyncCompleted(false);

    let isMounted = true;

    const runInitialSync = async (): Promise<void> => {
      await sync();
      if (isMounted) {
        setHasInitialSyncCompleted(true);
      }
    };

    void runInitialSync();

    return (): void => {
      isMounted = false;
    };
  }, [userId, sync]);

  return (
    <SyncContext.Provider value={{ sync, isSyncing, hasInitialSyncCompleted }}>
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
