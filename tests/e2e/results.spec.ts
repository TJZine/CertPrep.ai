import { test, expect, TEST_QUIZ } from "./fixtures";
import type { Page } from "@playwright/test";

import { seedResult, createTestResult } from "./fixtures/analyticsData";
import { waitForDatabase } from "./helpers/db";

/** Max timeout for loading states to resolve */
const LOADING_TIMEOUT = 15000;

/**
 * Reloads the page and waits for the IndexedDB database to be ready.
 * Use after seeding data to ensure the page picks up the new records.
 *
 * @param page - Playwright page instance
 */
async function reloadAndWaitForDB(page: Page): Promise<void> {
    await page.reload();
    await waitForDatabase(page);
}

/**
 * Waits for a loading indicator matching the pattern to disappear.
 * Use to ensure async data loading has completed before asserting on content.
 *
 * @param page - Playwright page instance
 * @param pattern - Regex pattern to match loading text (default: /loading/i)
 */
async function waitForLoadingToComplete(
    page: Page,
    pattern: RegExp = /loading/i,
): Promise<void> {
    await expect(
        page.getByText(pattern).first(),
    ).not.toBeVisible({ timeout: LOADING_TIMEOUT });
}


test.describe("Results Page", () => {
    test.describe("Valid Result", () => {
        test("displays score percentage correctly", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            // Seed a quiz
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await reloadAndWaitForDB(page);

            // Seed a result for this quiz (1/2 = 50% correct)
            const result = createTestResult({
                quiz_id: quiz.id,
                score: 50, // Matches 1/2 correct answers below
                answers: {
                    [quiz.questions[0]!.id]: "B", // Correct
                    [quiz.questions[1]!.id]: "A", // Wrong (correct is C)
                },
            });
            await seedResult(page, result);
            await reloadAndWaitForDB(page);

            // Navigate to the result page
            await page.goto(`/results/${result.id}`);

            // Wait for loading
            await waitForLoadingToComplete(page, /loading your results/i);

            // Verify score is displayed (use .first() as score appears in multiple places)
            await expect(page.getByText("50%").first()).toBeVisible();
        });

        test("shows quiz title and mode", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await reloadAndWaitForDB(page);

            const result = createTestResult({
                quiz_id: quiz.id,
                mode: "zen",
                score: 100,
            });
            await seedResult(page, result);
            await reloadAndWaitForDB(page);

            await page.goto(`/results/${result.id}`);

            await waitForLoadingToComplete(page, /loading your results/i);

            // Quiz title should be visible somewhere on the page
            await expect(page.getByText(quiz.title)).toBeVisible();
        });

        test("retry button navigates to quiz lobby", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await reloadAndWaitForDB(page);

            const result = createTestResult({
                quiz_id: quiz.id,
                score: 50,
            });
            await seedResult(page, result);
            await reloadAndWaitForDB(page);

            await page.goto(`/results/${result.id}`);

            await waitForLoadingToComplete(page, /loading your results/i);

            // Find and click retry/retake button
            const retryButton = page.getByRole("button", { name: "Retake Quiz" });
            await expect(retryButton).toBeVisible();
            await retryButton.click();

            // Should navigate to quiz route (now includes mode for direct retake UX)
            await expect(page).toHaveURL(`/quiz/${quiz.id}/zen`);
        });
    });

    test.describe("Error States", () => {
        test("handles non-existent result gracefully", async ({
            authenticatedPage: page,
        }) => {
            // Navigate to a result that doesn't exist
            await page.goto("/results/non-existent-result-id");

            // Wait for loading/sync to complete
            await waitForLoadingToComplete(page, /loading|syncing/i);

            // Verify error state
            await expect(page.getByText(/result not found/i)).toBeVisible();

            // Verify back button
            await expect(
                page.getByRole("button", { name: /back to dashboard/i }),
            ).toBeVisible();
        });

        test("back to dashboard button works from error state", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/results/invalid-id-12345");

            await waitForLoadingToComplete(page, /loading|syncing/i);

            await expect(page.getByText(/result not found/i)).toBeVisible();

            // Click back button
            await page.getByRole("button", { name: /back to dashboard/i }).click();

            // Verify navigation
            await expect(page).toHaveURL("/");
        });
    });
});
