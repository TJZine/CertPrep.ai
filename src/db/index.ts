import Dexie, { type Table } from 'dexie';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

// PRIVACY: All quiz data and results are stored locally in IndexedDB via Dexie; nothing leaves the device.

/**
 * Dexie-backed database instance for CertPrep.ai.
 */
export class CertPrepDatabase extends Dexie {
  public quizzes!: Table<Quiz, string>;

  public results!: Table<Result, string>;

  constructor() {
    super('CertPrepDatabase');

    // Define schema version and indexes.
    this.version(2).stores({
      quizzes: 'id, title, created_at, *tags, sourceId',
      results: 'id, quiz_id, timestamp, mode, score',
    });

    this.quizzes = this.table('quizzes');
    this.results = this.table('results');
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
    await db.transaction('rw', db.quizzes, db.results, async () => {
      await Promise.all([db.quizzes.clear(), db.results.clear()]);
    });
  } catch (error) {
    console.error('[CertPrep.ai] Failed to clear database', error);
    throw new Error('Unable to clear CertPrep.ai database.');
  }
}

export * from './quizzes';
export * from './results';
