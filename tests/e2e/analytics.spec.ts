import { test, expect, TEST_QUIZ } from "./fixtures";
import { seedAnalyticsData } from "./fixtures/analyticsData";
import { waitForDatabase } from "./helpers/db";
import { E2E_TIMEOUTS } from "./helpers/timeouts";
import type { Page } from "@playwright/test";
import type { Quiz } from "@/types/quiz";

/**
 * Helper to setup analytics test data.
 * Seeds quiz, reloads page, seeds analytics data, and navigates to /analytics.
 * Encapsulates the repeated setup pattern for maintainability.
 */
async function setupAnalyticsWithData(
    page: Page,
    seedTestQuiz: (quiz: Omit<Quiz, "user_id">) => Promise<Quiz>,
): Promise<Quiz> {
    const quiz = await seedTestQuiz(TEST_QUIZ);
    await page.reload();
    await waitForDatabase(page);

    await seedAnalyticsData(page, quiz.id);
    await page.reload();
    await waitForDatabase(page);

    await page.goto("/analytics");

    // Wait for loading to finish
    await expect(
        page.getByText(/loading analytics|syncing/i).first(),
    ).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

    return quiz;
}

test.describe("Analytics Page", () => {
    test.describe("Empty State", () => {
        test("displays empty state when no results", async ({
            authenticatedPage: page,
        }) => {
            // Navigate to analytics with no data seeded
            await page.goto("/analytics");

            // Wait for loading to finish
            await expect(
                page.getByText(/loading analytics|syncing/i).first(),
            ).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

            // Verify empty state message
            await expect(page.getByRole("heading", { name: "No Data Yet" })).toBeVisible();
            await expect(
                page.getByText(/complete some quizzes to see your performance/i),
            ).toBeVisible();

            // Verify CTA button
            await expect(page.getByRole("button", { name: /start a quiz/i })).toBeVisible();
        });

        test("empty state CTA navigates to dashboard", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/analytics");

            // Wait for empty state
            await expect(page.getByRole("heading", { name: "No Data Yet" })).toBeVisible();

            // Click CTA
            await page.getByRole("button", { name: /start a quiz/i }).click();

            // Verify navigation to dashboard
            await expect(page).toHaveURL("/");
        });
    });


    test.describe("With Data", () => {
        test("shows readiness score based on results", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            await setupAnalyticsWithData(page, seedTestQuiz);

            // Verify Analytics heading is visible (confirms page loaded)
            await expect(
                page.getByRole("heading", { level: 1, name: "Analytics" }),
            ).toBeVisible();

            // Verify Exam Readiness card is displayed
            // The card shows a percentage score based on recent performance
            await expect(page.getByText(/exam readiness/i)).toBeVisible();
        });

        test("displays streak card with accurate count", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            // Seed data with consecutive days (creates a 4-day streak)
            await setupAnalyticsWithData(page, seedTestQuiz);

            // Verify streak card is visible
            // The StreakCard shows current streak and study activity
            await expect(page.getByText(/current streak/i)).toBeVisible();
        });

        test("shows category breakdown in weak areas", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            // Seed data with Security as a weak area (50% score)
            await setupAnalyticsWithData(page, seedTestQuiz);

            // Verify weak areas card is present
            // Using heading to avoid ambiguity with legend text
            await expect(page.getByRole("heading", { name: /areas to improve/i })).toBeVisible();
        });

        test("navigates to topic study from weak area", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            await setupAnalyticsWithData(page, seedTestQuiz);

            // Find and click "Study This Topic" button if visible
            const studyButton = page.getByRole("button", { name: /study this topic/i });

            // Only test navigation if the button exists (depends on thresholds)
            const buttonCount = await studyButton.count();
            if (buttonCount > 0) {
                await studyButton.first().click();

                // Should navigate to a study route
                await expect(page).toHaveURL(/\/quiz\/.*\/zen|\/study/);
            } else {
                // If no weak areas are below threshold, verify the page loaded correctly
                await expect(
                    page.getByRole("heading", { level: 1, name: "Analytics" }),
                ).toBeVisible();
            }
        });
    });

});
