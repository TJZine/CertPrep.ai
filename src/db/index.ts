import Dexie, { type Table } from 'dexie';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

import type { SyncState } from '@/types/sync';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// PRIVACY: Data is stored locally in IndexedDB via Dexie (Local-First).
// Secure cloud sync (Supabase) is used for backup and cross-device synchronization only.

/**
 * Dexie-backed database instance for CertPrep.ai.
 */
export class CertPrepDatabase extends Dexie {
  public quizzes!: Table<Quiz, string>;

  public results!: Table<Result, string>;

  public syncState!: Table<SyncState, string>;

  constructor() {
    super('CertPrepDatabase');

    // Define schema version and indexes.
    // Version 5: Add user_id and composite indexes for per-user isolation; scope sync cursor per user.
    this.version(5).stores({
      quizzes: 'id, title, category, created_at, *tags',
      results: 'id, quiz_id, timestamp, synced, user_id, [user_id+synced], [user_id+quiz_id], [user_id+timestamp]',
      syncState: 'table, lastSyncedAt, synced, lastId',
    }).upgrade(async (tx) => {
      // Backfill legacy results without user_id to a nil UUID and force re-sync prevention.
      const resultsTable = tx.table('results');
      await resultsTable.toCollection().modify((result: Record<string, unknown>) => {
        if (!('user_id' in result) || !result.user_id) {
          result.user_id = NIL_UUID;
          result.synced = 0;
        }
      });
    });

    this.quizzes = this.table('quizzes');
    this.results = this.table('results');
    this.syncState = this.table('syncState');
  }
}

export const db = new CertPrepDatabase();

/**
 * Opens the IndexedDB connection. Throws with contextual information on failure.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (!db.isOpen()) {
      await db.open();
      console.warn('[CertPrep.ai] Database initialized');
    }
  } catch (error) {
    console.error('[CertPrep.ai] Failed to initialize database', error);
    throw new Error('Unable to initialize CertPrep.ai database.');
  }
}

/**
 * Clears all quizzes, results, and sync state. Intended for testing/reset flows.
 */
export async function clearDatabase(): Promise<void> {
  try {
    await db.transaction('rw', db.quizzes, db.results, db.syncState, async () => {
      await Promise.all([db.quizzes.clear(), db.results.clear(), db.syncState.clear()]);
    });
  } catch (error) {
    console.error('[CertPrep.ai] Failed to clear database', error);
    throw new Error('Unable to clear CertPrep.ai database.');
  }
}

export * from './quizzes';
export * from './results';
