import Dexie, { type Table } from 'dexie';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

// PRIVACY: Data is stored locally in IndexedDB via Dexie (Local-First).
// Secure cloud sync (Supabase) is used for backup and cross-device synchronization only.

/**
 * Dexie-backed database instance for CertPrep.ai.
 */
export class CertPrepDatabase extends Dexie {
  public quizzes!: Table<Quiz, string>;

  public results!: Table<Result, string>;

  public syncState!: Table<{ userId: string; lastSyncedAt: string }, string>;

  constructor() {
    super('CertPrepDatabase');

    // Define schema version and indexes.
    this.version(2).stores({
      quizzes: 'id, title, created_at, *tags, sourceId',
      results: 'id, quiz_id, timestamp, mode, score, synced',
      syncState: 'userId',
    }).upgrade(async (trans) => {
      // Backfill 'synced' property for existing results
      await trans.table('results').toCollection().modify((result) => {
        if (result.synced === undefined) {
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
 * Clears all quizzes and results. Intended for testing/reset flows.
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
