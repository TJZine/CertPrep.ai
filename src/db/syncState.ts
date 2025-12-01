import { db, NIL_UUID } from './index';

export interface SyncCursor {
  timestamp: string;
  lastId: string;
}

export async function getSyncCursor(userId: string): Promise<SyncCursor> {
  const key = `results:${userId}`;
  // Fallback to legacy key if present
  const state = await db.syncState.get(key) ?? await db.syncState.get('results');

  return {
    timestamp: state?.lastSyncedAt ? new Date(state.lastSyncedAt).toISOString() : '1970-01-01T00:00:00.000Z',
    lastId: state?.lastId || NIL_UUID,
  };
}

export async function setSyncCursor(timestamp: string, userId: string, lastId?: string): Promise<void> {
  const key = `results:${userId}`;
  // We store the timestamp as a number in SyncState
  await db.syncState.put({ 
    table: key, 
    lastSyncedAt: new Date(timestamp).getTime(), 
    synced: 1,
    lastId: lastId || NIL_UUID
  });
}
