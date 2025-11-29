'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { syncResults } from '@/lib/sync/syncManager';
import { useCallback, useEffect } from 'react';

export function useSync(): { sync: () => Promise<void> } {
  const { user } = useAuth();
  const userId = user?.id;

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
