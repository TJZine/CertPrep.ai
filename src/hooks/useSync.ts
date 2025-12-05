import { useSyncContext } from "@/components/providers/SyncProvider";

export interface UseSyncReturn {
  /** Manually trigger a sync */
  sync: () => Promise<void>;
  /** True while initial sync is in progress */
  isSyncing: boolean;
  /** True after the first sync attempt has completed (success or failure) */
  hasInitialSyncCompleted: boolean;
}

export function useSync(): UseSyncReturn {
  return useSyncContext();
}
