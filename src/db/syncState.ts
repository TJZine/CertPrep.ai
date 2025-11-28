import { db } from './index';

export async function getSyncCursor(userId: string): Promise<string> {
  const state = await db.syncState.get(userId);
  return state?.lastSyncedAt || '1970-01-01T00:00:00.000Z';
}

export async function setSyncCursor(userId: string, timestamp: string): Promise<void> {
  await db.syncState.put({ userId, lastSyncedAt: timestamp });
}
