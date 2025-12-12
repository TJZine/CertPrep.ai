import { test, expect, TEST_QUIZ } from "./fixtures";

import { seedResult, createTestResult } from "./fixtures/analyticsData";
import { waitForDatabase } from "./helpers/db";

test.describe("Results Page", () => {
    test.describe("Valid Result", () => {
        test("displays score percentage correctly", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            // Seed a quiz
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await page.reload();
            await waitForDatabase(page);

            // Seed a result for this quiz
            const result = createTestResult({
                quiz_id: quiz.id,
                score: 80,
                answers: {
                    [quiz.questions[0]!.id]: "B", // Correct
                    [quiz.questions[1]!.id]: "A", // Wrong (correct is C)
                },
            });
            await seedResult(page, result);
            await page.reload();
            await waitForDatabase(page);

            // Navigate to the result page
            await page.goto(`/results/${result.id}`);

            // Wait for loading
            await expect(
                page.getByText(/loading your results/i).first(),
            ).not.toBeVisible({ timeout: 15000 });

            // Verify score is displayed
            await expect(page.getByText("80%")).toBeVisible();
        });

        test("shows quiz title and mode", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await page.reload();
            await waitForDatabase(page);

            const result = createTestResult({
                quiz_id: quiz.id,
                mode: "zen",
                score: 100,
            });
            await seedResult(page, result);
            await page.reload();
            await waitForDatabase(page);

            await page.goto(`/results/${result.id}`);

            await expect(
                page.getByText(/loading your results/i).first(),
            ).not.toBeVisible({ timeout: 15000 });

            // Quiz title should be visible somewhere on the page
            await expect(page.getByText(quiz.title)).toBeVisible();
        });

        test("retry button navigates to quiz lobby", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await page.reload();
            await waitForDatabase(page);

            const result = createTestResult({
                quiz_id: quiz.id,
                score: 50,
            });
            await seedResult(page, result);
            await page.reload();
            await waitForDatabase(page);

            await page.goto(`/results/${result.id}`);

            await expect(
                page.getByText(/loading your results/i).first(),
            ).not.toBeVisible({ timeout: 15000 });

            // Find and click retry/retake button
            const retryButton = page.getByRole("button", { name: "Retake Quiz" });
            await expect(retryButton).toBeVisible();
            await retryButton.click();

            // Should navigate to quiz route
            await expect(page).toHaveURL(new RegExp(`/quiz/${quiz.id}`));
        });
    });

    test.describe("Error States", () => {
        test("handles non-existent result gracefully", async ({
            authenticatedPage: page,
        }) => {
            // Navigate to a result that doesn't exist
            await page.goto("/results/non-existent-result-id");

            // Wait for loading/sync to complete
            await expect(
                page.getByText(/loading|syncing/i).first(),
            ).not.toBeVisible({ timeout: 15000 });

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

            await expect(
                page.getByText(/loading|syncing/i).first(),
            ).not.toBeVisible({ timeout: 15000 });

            await expect(page.getByText(/result not found/i)).toBeVisible();

            // Click back button
            await page.getByRole("button", { name: /back to dashboard/i }).click();

            // Verify navigation
            await expect(page).toHaveURL("/");
        });
    });
});
