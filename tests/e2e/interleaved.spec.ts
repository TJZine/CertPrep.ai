/**
 * E2E Test: Interleaved Practice Flow
 *
 * Tests the interleaved practice functionality:
 * - Configuring an interleaved session
 * - Verifying category filtering
 * - Empty state handling
 * 
 * Note: Full session completion is complex due to dynamic question count
 * and sessionStorage state. We test the config flow and entry points.
 */

import { test, expect, TEST_QUIZ } from "./fixtures";
import { E2E_TIMEOUTS } from "./helpers/timeouts";
import type { Quiz } from "../../src/types/quiz";

/**
 * Creates a quiz with specified category for interleaved testing.
 */
function createCategoryQuiz(id: string, category: string): Omit<Quiz, "user_id"> {
    return {
        ...TEST_QUIZ,
        id,
        title: `${category} Quiz`,
        description: `Quiz for ${category} category`,
        questions: TEST_QUIZ.questions.map((q, i) => ({
            ...q,
            id: `${id}-q${i + 1}`,
            category,
        })),
    };
}

test.describe("Interleaved Practice Flow", () => {
    test("configures and starts interleaved session", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // 1. Seed multiple quizzes with different categories
        await seedTestQuiz(createCategoryQuiz("interleaved-quiz-1", "Category A"));
        await seedTestQuiz(createCategoryQuiz("interleaved-quiz-2", "Category B"));

        // 2. Navigate to interleaved practice
        await page.goto("/interleaved");

        // 3. Wait for page to load
        await expect(page.getByRole("heading", { name: /interleaved practice/i })).toBeVisible({
            timeout: E2E_TIMEOUTS.HYDRATION,
        });
        await expect(page.locator(".h-8.w-8.animate-spin")).not.toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 4. Verify categories are shown
        await expect(page.getByRole("button", { name: "Category A" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Category B" })).toBeVisible();

        // 5. Verify question counts are shown
        await expect(page.getByText(/questions available/i)).toBeVisible();

        // 6. Select smallest question count
        await page.getByRole("button", { name: "10" }).click();

        // 7. Start practice
        await page.getByRole("button", { name: /start practice/i }).click();

        // 8. Verify navigated to session page
        await expect(page).toHaveURL(/\/interleaved\/session/, { timeout: E2E_TIMEOUTS.HYDRATION });

        // 9. Verify quiz loaded (first question visible)
        await expect(page.getByRole("radio").first()).toBeVisible({ timeout: E2E_TIMEOUTS.HYDRATION });
    });

    test("respects category filter", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // 1. Seed quizzes with different categories
        await seedTestQuiz(createCategoryQuiz("filter-quiz-1", "Science"));
        await seedTestQuiz(createCategoryQuiz("filter-quiz-2", "History"));

        // 2. Navigate to interleaved practice
        await page.goto("/interleaved");
        await expect(page.getByRole("heading", { name: /interleaved practice/i })).toBeVisible({
            timeout: E2E_TIMEOUTS.HYDRATION,
        });
        await expect(page.locator(".h-8.w-8.animate-spin")).not.toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 3. Verify both categories are shown
        await expect(page.getByRole("button", { name: "Science" })).toBeVisible();
        await expect(page.getByRole("button", { name: "History" })).toBeVisible();

        // 4. Select only "Science" category
        await page.getByRole("button", { name: "Science" }).click();

        // 5. Verify "1 selected" in summary
        await expect(page.getByText(/1 selected/i)).toBeVisible();
    });

    test("shows empty state when no quizzes imported", async ({
        authenticatedPage: page,
    }) => {
        // DB is already cleared by fixture - no quizzes exist

        // Navigate to interleaved practice
        await page.goto("/interleaved");
        await expect(page.getByRole("heading", { name: /interleaved practice/i })).toBeVisible({
            timeout: E2E_TIMEOUTS.HYDRATION,
        });
        await expect(page.locator(".h-8.w-8.animate-spin")).not.toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // Verify start button is disabled (no questions available)
        await expect(page.getByRole("button", { name: /start practice/i })).toBeDisabled();
    });
});
