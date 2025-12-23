/**
 * E2E Test: SRS Review Flow
 *
 * Tests the spaced repetition system review functionality:
 * - Completing an SRS review session
 * - Verifying results are saved correctly
 * - Empty state handling
 * 
 * NOTE: These tests are currently skipped due to intermittent failures.
 * The SRS state seeding works correctly (verified via getSRSStatesByUserId)
 * but the page's getDueQuestions query sometimes doesn't recognize the seeded
 * states. This appears to be a race condition between IndexedDB writes and
 * the app's Dexie instance re-querying.
 * 
 * TODO: Investigate whether adding explicit waitForDatabase() after seeding
 * or using page.reload() can improve reliability.
 */

import { test, expect, TEST_QUIZ } from "./fixtures";
import {
    seedSRSState,
    getResultsByUserId,
    getEffectiveUserId,
} from "./helpers/db";
import { E2E_TIMEOUTS } from "./helpers/timeouts";
import type { SRSState } from "../../src/types/srs";

/**
 * Creates a due SRS state for testing.
 * Sets next_review to 1 hour ago so the question appears as "due".
 */
function createDueSRSState(questionId: string, userId: string): SRSState {
    const now = Date.now();
    return {
        question_id: questionId,
        user_id: userId,
        box: 1,
        last_reviewed: now - 86400000, // 1 day ago
        next_review: now - 3600000, // 1 hour ago (due)
        consecutive_correct: 0,
        synced: 0,
        updated_at: now - 86400000,
    };
}

/**
 * Helper to select an answer option by its letter key.
 */
async function selectOption(
    page: import("@playwright/test").Page,
    letter: string,
): Promise<void> {
    const option = page.getByRole("radio", { name: new RegExp(`^${letter}\\s`) });
    await option.click();
}

test.describe("SRS Review Flow", () => {
    test("completes SRS review and saves result", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // 1. Seed quiz
        const quiz = await seedTestQuiz(TEST_QUIZ);

        // 2. Get actual effective user ID from browser
        const effectiveUserId = await getEffectiveUserId(page);
        expect(effectiveUserId).not.toBeNull();

        // 3. Seed SRS states for all questions
        for (const question of quiz.questions) {
            await seedSRSState(page, createDueSRSState(question.id, effectiveUserId!));
        }

        // 4. Navigate to study-due
        await page.goto("/study-due");

        // Wait for page to load
        await expect(page.getByRole("heading", { name: /spaced repetition review/i })).toBeVisible({
            timeout: E2E_TIMEOUTS.HYDRATION,
        });

        // Wait for loading to complete
        await expect(page.locator(".h-8.w-8.animate-spin")).not.toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 5. Wait for Start Review button (seeded SRS data should show due questions)
        await expect(page.getByRole("button", { name: /start review/i })).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 6. Click Start Review
        await expect(page.getByRole("button", { name: /start review/i })).toBeVisible();
        await page.getByRole("button", { name: /start review/i }).click();

        // 7. Verify navigated to SRS review page
        await expect(page).toHaveURL(/\/quiz\/srs-review/);

        // 8. Answer Q1 correctly (TEST_QUIZ Q1 answer is B)
        await expect(page.getByText(quiz.questions[0]!.question)).toBeVisible({
            timeout: E2E_TIMEOUTS.HYDRATION,
        });
        await selectOption(page, "B");
        await page.getByRole("button", { name: /check/i }).click();
        await expect(page.getByText(/correct/i).first()).toBeVisible();
        await page.getByRole("button", { name: /good/i }).click();

        // 9. Answer Q2 correctly (TEST_QUIZ Q2 answer is C)
        await selectOption(page, "C");
        await page.getByRole("button", { name: /check/i }).click();
        await expect(page.getByText(/correct/i).first()).toBeVisible();
        await page.getByRole("button", { name: /good|finish/i }).click();

        // 10. Verify redirected to results page
        await expect(page).toHaveURL(/\/results/);

        // 11. Verify result saved in IndexedDB
        await expect.poll(async () => {
            const results = await getResultsByUserId(page, effectiveUserId!);
            return results.filter((r) => !r.deleted_at).length;
        }, {
            message: "Result should be saved in IndexedDB",
            timeout: E2E_TIMEOUTS.LOADING,
        }).toBeGreaterThan(0);
    });

    test("shows empty state when no questions due", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // 1. Seed quiz but NO SRS states (no questions due)
        await seedTestQuiz(TEST_QUIZ);

        // 2. Navigate to study-due
        await page.goto("/study-due");

        // 3. Wait for page to load
        await expect(page.getByRole("heading", { name: /spaced repetition review/i })).toBeVisible({
            timeout: E2E_TIMEOUTS.HYDRATION,
        });
        await expect(page.locator(".animate-spin")).not.toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 4. Verify empty state - the DueQuestionsCard should show 0
        await expect(page.getByText("No questions due for review")).toBeVisible();
    });
});
