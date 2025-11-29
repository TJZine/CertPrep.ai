import { db } from './index';

export interface SyncCursor {
  timestamp: string;
  lastId: string;
}

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export async function getSyncCursor(userId: string): Promise<SyncCursor> {
  const state = await db.syncState.get(userId);
  return {
    timestamp: state?.lastSyncedAt || '1970-01-01T00:00:00.000Z',
    lastId: state?.lastId || NIL_UUID,
  };
}

export async function setSyncCursor(userId: string, timestamp: string, lastId: string): Promise<void> {
  await db.syncState.put({ userId, lastSyncedAt: timestamp, lastId });
}
