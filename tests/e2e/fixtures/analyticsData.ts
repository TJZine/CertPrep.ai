import type { Page } from "@playwright/test";
import type { Result } from "../../../src/types/result";
import { MOCK_USER } from "./auth";

/**
 * Seeds a single result directly to IndexedDB.
 * Uses the exposed Dexie instance if available, otherwise uses raw IndexedDB.
 *
 * @param page - Playwright page
 * @param result - Result object to seed
 * @returns The ID of the seeded result
 */
export async function seedResult(page: Page, result: Result): Promise<string> {
    return page.evaluate(async (resultData) => {
        // Try using exposed Dexie first
        if (window.__certprepDb) {
            if (!window.__certprepDb.isOpen()) {
                await window.__certprepDb.open();
            }
            return window.__certprepDb.results.put(resultData);
        }

        // Fall back to raw IndexedDB
        return new Promise<string>((resolve, reject) => {
            const request = indexedDB.open("CertPrepDatabase");
            request.onerror = (): void => reject(request.error);
            request.onsuccess = (): void => {
                const db = request.result;
                try {
                    const tx = db.transaction("results", "readwrite");
                    const store = tx.objectStore("results");
                    const addRequest = store.put(resultData);

                    addRequest.onerror = (): void => {
                        db.close();
                        reject(addRequest.error);
                    };
                    addRequest.onsuccess = (): void => {
                        db.close();
                        resolve(resultData.id);
                    };
                } catch (err) {
                    db.close();
                    reject(err);
                }
            };
        });
    }, result);
}

/**
 * Creates a result object with sensible defaults for testing.
 */
export function createTestResult(
    overrides: Partial<Result> & { quiz_id: string },
): Result {
    const now = Date.now();
    return {
        id: `test-result-${crypto.randomUUID()}`,
        user_id: MOCK_USER.id,
        timestamp: now,
        mode: "zen",
        score: 80,
        time_taken_seconds: 120,
        answers: { q1: "B", q2: "C" },
        flagged_questions: [],
        category_breakdown: { Testing: 80 },
        synced: 0,
        ...overrides,
    };
}

/**
 * Seeds analytics data with varied scores, categories, and timestamps.
 * Creates a realistic set of results for testing analytics calculations.
 *
 * @param page - Playwright page
 * @param quizId - Quiz ID to associate results with
 * @returns Array of seeded result IDs
 */
export async function seedAnalyticsData(
    page: Page,
    quizId: string,
): Promise<string[]> {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Create results over the past 5 days for streak testing
    const results: Result[] = [
        // Today - high score
        createTestResult({
            quiz_id: quizId,
            timestamp: now,
            score: 90,
            category_breakdown: {
                Security: 95,
                Networking: 85,
                Testing: 90,
            },
        }),
        // Yesterday - medium score
        createTestResult({
            quiz_id: quizId,
            timestamp: now - oneDay,
            score: 75,
            category_breakdown: {
                Security: 70,
                Networking: 80,
                Testing: 75,
            },
        }),
        // 2 days ago - lower score (creates weak area)
        createTestResult({
            quiz_id: quizId,
            timestamp: now - 2 * oneDay,
            score: 65,
            category_breakdown: {
                Security: 50, // Weak area
                Networking: 75,
                Testing: 70,
            },
        }),
        // 3 days ago - builds streak
        createTestResult({
            quiz_id: quizId,
            timestamp: now - 3 * oneDay,
            score: 80,
            category_breakdown: {
                Security: 80,
                Networking: 80,
                Testing: 80,
            },
        }),
    ];

    const ids: string[] = [];
    for (const result of results) {
        const id = await seedResult(page, result);
        ids.push(id);
    }

    return ids;
}
