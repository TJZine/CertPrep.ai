/**
 * Shared IndexedDB seeding utilities for CertPrep.ai E2E scripts.
 * Extracted from cls-audit.mjs and lighthouse-e2e.mjs to reduce duplication.
 *
 * Prerequisites:
 * - App running with NEXT_PUBLIC_IS_E2E=true (exposes window.__certprepDb)
 */

/**
 * Seed IndexedDB with test data via window.__certprepDb.
 * Must be called on a page context where the app has loaded.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} options - Seed options
 * @param {string} options.baseUrl - Base URL of the app
 * @param {string} options.guestUserId - Guest user ID to seed data for
 * @param {number} options.quizCount - Number of quizzes to create
 * @param {number} [options.dueCount=0] - Number of due SRS items to create
 * @param {number} [options.resultCount=0] - Number of results to create
 * @param {string} [options.description="Seeded quiz"] - Description for quizzes
 * @returns {Promise<{ok: boolean, userId?: string, quizCount?: number, resultCount?: number, dueCount?: number, error?: string}>}
 */
export async function seedUserData(page, { baseUrl, guestUserId, quizCount, dueCount = 0, resultCount = 0, description = "Seeded quiz" }) {
    await page.goto("about:blank");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle0" });

    await page.waitForFunction(() => Boolean(window.__certprepDb), { timeout: 30_000 });

    const seedResult = await page.evaluate(async (input) => {
        const db = window.__certprepDb;
        if (!db) {
            return { ok: false, error: "window.__certprepDb is not available (set NEXT_PUBLIC_IS_E2E=true)" };
        }

        const userId = input.guestUserId;
        localStorage.setItem("cp_guest_user_id", userId);

        const now = Date.now();

        await db.open();

        // Clear existing data for user
        await Promise.all([
            db.quizzes.where("user_id").equals(userId).delete(),
            db.results.where("user_id").equals(userId).delete(),
            db.srs.where("user_id").equals(userId).delete(),
        ]);

        const makeQuestion = (index) => {
            const id = crypto.randomUUID();
            return {
                id,
                category: "General",
                difficulty: "Easy",
                question: `Question ${index + 1}?`,
                options: { a: "Option A", b: "Option B", c: "Option C", d: "Option D" },
                explanation: "Explanation",
            };
        };

        const makeQuiz = (index) => {
            const quizId = crypto.randomUUID();
            const questions = Array.from({ length: 6 }).map((_, qIndex) => makeQuestion(qIndex));
            return {
                id: quizId,
                user_id: userId,
                title: `Quiz ${index + 1}`,
                description: input.description,
                created_at: now - index * 1000,
                updated_at: now - index * 1000,
                questions,
                tags: ["seed"],
                version: 1,
                deleted_at: null,
                quiz_hash: quizId,
                last_synced_at: null,
                last_synced_version: null,
                category: "Seed",
                subcategory: "E2E",
            };
        };

        const quizzes = Array.from({ length: input.quizCount }).map((_, i) => makeQuiz(i));
        if (quizzes.length > 0) {
            await db.quizzes.bulkPut(quizzes);
        }

        // Create results
        const results = [];
        const targetResults = Math.max(0, input.resultCount ?? 0);
        if (targetResults > 0 && quizzes.length > 0) {
            const primaryQuiz = quizzes[0];
            const questionIds = primaryQuiz.questions.map((q) => q.id);
            for (let i = 0; i < targetResults; i += 1) {
                const resultId = crypto.randomUUID();
                const timestamp = now - i * 86_400_000; // one per day
                const answers = {};
                const categoryScores = {};

                for (const qId of questionIds) {
                    answers[qId] = "a";
                }
                categoryScores.General = { correct: Math.max(0, questionIds.length - 2), total: questionIds.length };

                results.push({
                    id: resultId,
                    quiz_id: primaryQuiz.id,
                    user_id: userId,
                    timestamp,
                    mode: i % 2 === 0 ? "zen" : "proctor",
                    score: 70 + (i % 4) * 5,
                    time_taken_seconds: 120 + i * 10,
                    answers,
                    flagged_questions: [],
                    category_breakdown: { General: 1 },
                    computed_category_scores: categoryScores,
                    synced: 0,
                });
            }
            await db.results.bulkPut(results);
        }

        // Create due SRS entries
        const dueEntries = [];
        const dueTarget = Math.max(0, input.dueCount);
        let dueAdded = 0;

        for (const quiz of quizzes) {
            for (const question of quiz.questions) {
                if (dueAdded >= dueTarget) break;
                dueEntries.push({
                    question_id: question.id,
                    user_id: userId,
                    box: 1,
                    last_reviewed: now - 86_400_000,
                    next_review: now - 1000,
                    consecutive_correct: 0,
                    synced: 0,
                    updated_at: now,
                });
                dueAdded += 1;
            }
            if (dueAdded >= dueTarget) break;
        }

        if (dueEntries.length > 0) {
            await db.srs.bulkPut(dueEntries);
        }

        return { ok: true, userId, quizCount: quizzes.length, resultCount: results.length, dueCount: dueEntries.length };
    }, { guestUserId, quizCount, dueCount, resultCount, description });

    if (!seedResult.ok) {
        throw new Error(seedResult.error || "Seed failed");
    }

    return seedResult;
}

/**
 * Wait for app hydration by polling for skeleton absence.
 * More reliable than arbitrary sleep timeouts.
 *
 * App's Skeleton.tsx component sets data-skeleton attribute.
 * Note: Some components use animate-pulse for UI placeholders,
 * which is why we check data-skeleton specifically.
 *
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} [options] - Wait options
 * @param {number} [options.timeout=10000] - Maximum wait time in ms
 * @param {number} [options.fallbackDelay=2000] - Fallback delay if check fails
 */
export async function waitForHydration(page, { timeout = 10_000, fallbackDelay = 2000 } = {}) {
    try {
        await page.waitForFunction(
            () => {
                // Check for skeleton elements (Skeleton.tsx sets data-skeleton attribute)
                const hasSkeletons = document.querySelector('[data-skeleton]') !== null;
                // Check for loading status containers
                const hasLoadingStatus = document.querySelector('[role="status"][aria-label*="Loading"]') !== null;
                return !hasSkeletons && !hasLoadingStatus;
            },
            { timeout },
        );
    } catch {
        // Fallback: if no skeletons detected or timeout, wait briefly
        await new Promise((resolve) => setTimeout(resolve, fallbackDelay));
    }
}
