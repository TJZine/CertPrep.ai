import { useSyncContext } from "@/components/providers/SyncProvider";

export interface UseSyncReturn {
  /** Manually trigger a sync */
  sync: () => Promise<{ success: boolean; error?: unknown }>;
  /** True while initial sync is in progress */
  isSyncing: boolean;
  /** True after the first sync attempt has completed (success or failure) */
  hasInitialSyncCompleted: boolean;
  /** Error encountered during the initial sync attempt, if any */
  initialSyncError: Error | null;
}

export function useSync(): UseSyncReturn {
  return useSyncContext();
}
