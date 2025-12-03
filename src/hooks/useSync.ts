'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { syncResults } from '@/lib/sync/syncManager';
import { syncQuizzes } from '@/lib/sync/quizSyncManager';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSyncReturn {
  /** Manually trigger a sync */
  sync: () => Promise<void>;
  /** True while initial sync is in progress */
  isSyncing: boolean;
  /** True after the first sync attempt has completed (success or failure) */
  hasInitialSyncCompleted: boolean;
}

export function useSync(): UseSyncReturn {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_last_user_id', userId);
    }
  }, [userId]);

  const sync = useCallback(async () => {
    if (userId) {
      setIsSyncing(true);
      try {
        await syncResults(userId);
        if (FEATURE_FLAGS.quizSync) {
          await syncQuizzes(userId);
        }
      } finally {
        setIsSyncing(false);
      }
    }
  }, [userId]);

  // Auto-sync on mount if user is logged in (handles page reloads/initial login)
  useEffect(() => {
    if (!userId) return;
    
    // Only run initial sync once per user session
    if (initialSyncAttemptedRef.current === userId) return;
    
    initialSyncAttemptedRef.current = userId;
    setHasInitialSyncCompleted(false);
    setIsSyncing(true);
    
    const runInitialSync = async (): Promise<void> => {
      try {
        await syncResults(userId);
        if (FEATURE_FLAGS.quizSync) {
          await syncQuizzes(userId);
        }
      } finally {
        setIsSyncing(false);
        setHasInitialSyncCompleted(true);
      }
    };
    
    void runInitialSync();
  }, [userId]);

  return { sync, isSyncing, hasInitialSyncCompleted };
}
