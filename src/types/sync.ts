export interface SyncState {
  table: string;
  lastSyncedAt: number | string;
  synced: number;
  lastId?: string;
  data?: unknown; // Keeping unknown for now as it can be various shapes, but explicit is better if possible.
}
