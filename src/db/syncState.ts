import { db, NIL_UUID } from './index';

export interface SyncCursor {
  timestamp: string;
  lastId: string;
}

export async function getSyncCursor(userId: string): Promise<SyncCursor> {
  if (!userId) return { timestamp: '1970-01-01T00:00:00.000Z', lastId: NIL_UUID };

  const key = `results:${userId}`;
  // Fallback to legacy key if present
  const state = await db.syncState.get(key) ?? await db.syncState.get('results');

  let timestamp = '1970-01-01T00:00:00.000Z';
  if (state?.lastSyncedAt) {
    timestamp = typeof state.lastSyncedAt === 'string'
      ? state.lastSyncedAt
      : new Date(state.lastSyncedAt).toISOString();
  }

  return {
    timestamp,
    lastId: state?.lastId || NIL_UUID,
  };
}

export async function setSyncCursor(timestamp: string, userId: string, lastId?: string): Promise<void> {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error('Invalid timestamp');
  const key = `results:${userId}`;
  // Store the timestamp as a string to preserve microsecond precision from Postgres
  await db.syncState.put({ 
    table: key, 
    lastSyncedAt: timestamp, 
    synced: 1,
    lastId: lastId || NIL_UUID
  });
}

export async function getQuizSyncCursor(userId: string): Promise<SyncCursor> {
  if (!userId) return { timestamp: '1970-01-01T00:00:00.000Z', lastId: NIL_UUID };

  const key = `quizzes:${userId}`;
  const state = await db.syncState.get(key);

  let timestamp = '1970-01-01T00:00:00.000Z';
  if (state?.lastSyncedAt) {
    timestamp = typeof state.lastSyncedAt === 'string'
      ? state.lastSyncedAt
      : new Date(state.lastSyncedAt).toISOString();
  }

  return {
    timestamp,
    lastId: state?.lastId || NIL_UUID,
  };
}

export async function setQuizSyncCursor(timestamp: string, userId: string, lastId?: string): Promise<void> {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error('Invalid timestamp');
  const key = `quizzes:${userId}`;
  await db.syncState.put({
    table: key,
    lastSyncedAt: timestamp, // Store as string for precision
    synced: 1,
    lastId: lastId || NIL_UUID,
  });
}

const QUIZ_BACKFILL_KEY = (userId: string): string => `quizzes:backfill:${userId}`;

export async function getQuizBackfillState(userId: string): Promise<boolean> {
  const state = await db.syncState.get(QUIZ_BACKFILL_KEY(userId));
  return state?.synced === 1;
}

export async function setQuizBackfillDone(userId: string): Promise<void> {
  await db.syncState.put({
    table: QUIZ_BACKFILL_KEY(userId),
    lastSyncedAt: Date.now(),
    synced: 1,
  });
}
