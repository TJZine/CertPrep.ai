'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { syncResults } from '@/lib/sync/syncManager';
import { useCallback, useEffect, useRef } from 'react';

export function useSync(): { sync: () => Promise<void> } {
  const { user } = useAuth();
  const userId = user?.id;
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    lastUserIdRef.current = userId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_last_user_id', userId);
    }
  }, [userId]);

  const sync = useCallback(async () => {
    if (userId) {
      await syncResults(userId);
    }
  }, [userId]);

  // Auto-sync on mount if user is logged in (handles page reloads/initial login)
  useEffect(() => {
    if (userId) {
      void sync();
    }
  }, [userId, sync]);

  return { sync };
}
