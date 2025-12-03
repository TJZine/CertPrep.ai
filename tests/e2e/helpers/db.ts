import type { Page } from '@playwright/test';
import type { Result } from '../../../src/types/result';
import type { Quiz } from '../../../src/types/quiz';
import type { CertPrepDatabase } from '../../../src/db';

/**
 * Type declaration for the exposed database on window.
 * Matches the exposure in src/db/index.ts for non-production environments.
 */
declare global {
  interface Window {
    __certprepDb?: CertPrepDatabase;
  }
}

/**
 * Opens IndexedDB directly using the raw API.
 * This is more reliable than waiting for Dexie to be exposed on window.
 */
async function openIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('CertPrepDatabase');
      request.onerror = (): void => reject(request.error);
      request.onsuccess = (): void => {
        request.result.close();
        resolve();
      };
      // If the DB doesn't exist, this will be called
      request.onupgradeneeded = (): void => {
        // Just close, we'll let the app create the schema
        request.result.close();
        resolve();
      };
    });
  });
}

/**
 * Waits for the Dexie database to be available on window.
 * Falls back to checking raw IndexedDB if Dexie isn't exposed.
 */
export async function waitForDatabase(page: Page, timeout = 10000): Promise<void> {
  try {
    // First try to wait for Dexie to be exposed
    await page.waitForFunction(
      () => typeof window.__certprepDb !== 'undefined',
      { timeout }
    );
  } catch {
    // Fall back to ensuring IndexedDB is accessible
    await openIndexedDB(page);
  }
}

/**
 * Query results directly from IndexedDB using raw API.
 * This doesn't rely on Dexie being exposed on window.
 */
async function queryResultsFromIndexedDB(page: Page): Promise<Result[]> {
  return page.evaluate(async () => {
    return new Promise<Result[]>((resolve, reject) => {
      const request = indexedDB.open('CertPrepDatabase');
      request.onerror = (): void => reject(request.error);
      request.onsuccess = (): void => {
        const db = request.result;
        try {
          const tx = db.transaction('results', 'readonly');
          const store = tx.objectStore('results');
          const getAllRequest = store.getAll();

          getAllRequest.onerror = (): void => {
            db.close();
            reject(getAllRequest.error);
          };
          getAllRequest.onsuccess = (): void => {
            db.close();
            resolve(getAllRequest.result as Result[]);
          };
        } catch (error) {
          console.warn('Error querying results table (likely does not exist):', error);
          db.close();
          // Table might not exist yet
          resolve([]);
        }
      };
    });
  });
}

/**
 * Gets all results from IndexedDB that match a specific sync status.
 *
 * @param page - Playwright page
 * @param synced - Sync flag: 0 = not synced, 1 = synced
 * @returns Array of results matching the sync status
 */
export async function getResultsBySyncStatus(
  page: Page,
  synced: 0 | 1
): Promise<Result[]> {
  const allResults = await queryResultsFromIndexedDB(page);
  return allResults.filter((r) => r.synced === synced);
}

/**
 * Gets a specific result by ID from IndexedDB.
 *
 * @param page - Playwright page
 * @param id - Result ID
 * @returns The result or undefined if not found
 */
export async function getResultById(
  page: Page,
  id: string
): Promise<Result | undefined> {
  const allResults = await queryResultsFromIndexedDB(page);
  return allResults.find((r) => r.id === id);
}

/**
 * Gets all results from IndexedDB for a specific user.
 *
 * @param page - Playwright page
 * @param userId - User ID to filter by
 * @returns Array of results for the user
 */
export async function getResultsByUserId(
  page: Page,
  userId: string
): Promise<Result[]> {
  const allResults = await queryResultsFromIndexedDB(page);
  return allResults.filter((r) => r.user_id === userId);
}

/**
 * Query quizzes directly from IndexedDB using raw API.
 */
async function queryQuizzesFromIndexedDB(page: Page): Promise<Quiz[]> {
  return page.evaluate(async () => {
    return new Promise<Quiz[]>((resolve, reject) => {
      const request = indexedDB.open('CertPrepDatabase');
      request.onerror = (): void => reject(request.error);
      request.onsuccess = (): void => {
        const db = request.result;
        try {
          const tx = db.transaction('quizzes', 'readonly');
          const store = tx.objectStore('quizzes');
          const getAllRequest = store.getAll();

          getAllRequest.onerror = (): void => {
            db.close();
            reject(getAllRequest.error);
          };
          getAllRequest.onsuccess = (): void => {
            db.close();
            resolve(getAllRequest.result as Quiz[]);
          };
        } catch (error) {
          console.warn('Error querying quizzes table (likely does not exist):', error);
          db.close();
          // Table might not exist yet
          resolve([]);
        }
      };
    });
  });
}

/**
 * Gets a quiz by ID from IndexedDB.
 *
 * @param page - Playwright page
 * @param id - Quiz ID
 * @returns The quiz or undefined if not found
 */
export async function getQuizById(
  page: Page,
  id: string
): Promise<Quiz | undefined> {
  const allQuizzes = await queryQuizzesFromIndexedDB(page);
  return allQuizzes.find((q) => q.id === id);
}

/**
 * Seeds a quiz into IndexedDB for testing.
 * Uses the exposed Dexie instance if available, otherwise uses raw IndexedDB.
 *
 * @param page - Playwright page
 * @param quiz - Quiz object to seed
 * @returns The ID of the seeded quiz
 */
export async function seedQuiz(page: Page, quiz: Quiz): Promise<string> {
  return page.evaluate(async (quizData) => {
    // Try using exposed Dexie first
    if (window.__certprepDb) {
      if (!window.__certprepDb.isOpen()) {
        await window.__certprepDb.open();
      }
      return window.__certprepDb.quizzes.put(quizData);
    }

    // Fall back to raw IndexedDB
    return new Promise<string>((resolve, reject) => {
      const request = indexedDB.open('CertPrepDatabase');
      request.onerror = (): void => reject(request.error);
      request.onsuccess = (): void => {
        const db = request.result;
        try {
          const tx = db.transaction('quizzes', 'readwrite');
          const store = tx.objectStore('quizzes');
          const addRequest = store.put(quizData);

          addRequest.onerror = (): void => {
            db.close();
            reject(addRequest.error);
          };
          addRequest.onsuccess = (): void => {
            db.close();
            resolve(quizData.id);
          };
        } catch (err) {
          db.close();
          reject(err);
        }
      };
    });
  }, quiz);
}

/**
 * Clears all data from IndexedDB tables.
 * Useful for test isolation.
 *
 * @param page - Playwright page
 */
export async function clearDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Try using exposed Dexie first
    if (window.__certprepDb) {
      if (!window.__certprepDb.isOpen()) {
        await window.__certprepDb.open();
      }
      await Promise.all([
        window.__certprepDb.quizzes.clear(),
        window.__certprepDb.results.clear(),
        window.__certprepDb.syncState.clear(),
      ]);
      return;
    }

    // Fall back to raw IndexedDB
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('CertPrepDatabase');
      request.onerror = (): void => reject(request.error);
      request.onsuccess = (): void => {
        const db = request.result;
        const storeNames = ['quizzes', 'results', 'syncState'];
        const availableStores = Array.from(db.objectStoreNames);

        const storesToClear = storeNames.filter((s) => availableStores.includes(s));

        if (storesToClear.length === 0) {
          db.close();
          resolve();
          return;
        }

        try {
          const tx = db.transaction(storesToClear, 'readwrite');

          tx.oncomplete = (): void => {
            db.close();
            resolve();
          };
          tx.onerror = (): void => {
            db.close();
            reject(tx.error);
          };

          for (const storeName of storesToClear) {
            tx.objectStore(storeName).clear();
          }
        } catch (err) {
          db.close();
          reject(err);
        }
      };
    });
  });
}

/**
 * Gets the count of unsynced results in IndexedDB.
 *
 * @param page - Playwright page
 * @returns Number of results with synced = 0
 */
export async function getUnsyncedResultCount(page: Page): Promise<number> {
  const results = await getResultsBySyncStatus(page, 0);
  return results.length;
}

/**
 * Gets all quizzes from IndexedDB.
 *
 * @param page - Playwright page
 * @returns Array of all quizzes
 */
export async function getAllQuizzes(page: Page): Promise<Quiz[]> {
  return queryQuizzesFromIndexedDB(page);
}

/**
 * Checks if a result exists with the specified sync status.
 *
 * @param page - Playwright page
 * @param resultId - Result ID to check
 * @param expectedSynced - Expected sync status
 * @returns true if result exists with the expected sync status
 */
export async function resultHasSyncStatus(
  page: Page,
  resultId: string,
  expectedSynced: 0 | 1
): Promise<boolean> {
  const result = await getResultById(page, resultId);
  return result?.synced === expectedSynced;
}
