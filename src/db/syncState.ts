import { db } from './index';

export interface SyncCursor {
  timestamp: string;
  lastId: string;
}

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export async function getSyncCursor(): Promise<SyncCursor> {
  // We use the 'results' table key for tracking results sync
  const state = await db.syncState.get('results');
  
  return {
    timestamp: state?.lastSyncedAt ? new Date(state.lastSyncedAt).toISOString() : '1970-01-01T00:00:00.000Z',
    lastId: state?.lastId || NIL_UUID,
  };
}

export async function setSyncCursor(timestamp: string, lastId?: string): Promise<void> {
  // We store the timestamp as a number in SyncState
  await db.syncState.put({ 
    table: 'results', 
    lastSyncedAt: new Date(timestamp).getTime(), 
    synced: 1,
    lastId: lastId || NIL_UUID
  });
}
