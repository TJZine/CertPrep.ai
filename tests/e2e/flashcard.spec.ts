/**
 * E2E Test: Flashcard Study Mode
 *
 * Tests the flashcard study experience:
 * - Navigating to flashcard mode from quiz
 * - Flipping cards and rating
 * - Session completion and summary
 */

import { test, expect, TEST_QUIZ } from "./fixtures";
import { waitForDatabase } from "./helpers/db";
import { E2E_TIMEOUTS } from "./helpers/timeouts";

test.describe("Flashcard Study Mode", () => {
    test("completes flashcard session and shows summary", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // 1. Seed quiz
        const quiz = await seedTestQuiz(TEST_QUIZ);
        await page.reload();
        await waitForDatabase(page);

        // 2. Navigate to flashcard mode for this quiz
        await page.goto(`/quiz/${quiz.id}/flashcard`);

        // 3. Wait for first card to be visible
        await expect(page.getByText(quiz.questions[0]!.question!)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 4. Verify progress shows "Card 1 of 2"
        await expect(page.getByText(/card 1 of 2/i)).toBeVisible();

        // 5. Click "Reveal Answer" to flip the card
        await page.getByRole("button", { name: "Reveal Answer", exact: true }).click();

        // 6. Verify answer is visible (explanation or correct answer text)
        await expect(page.getByText(quiz.questions[0]!.explanation!)).toBeVisible({
            timeout: E2E_TIMEOUTS.ANIMATION,
        });

        // 7. Verify rating buttons are visible
        await expect(page.getByRole("button", { name: /forgot/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /hard/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /good/i })).toBeVisible();

        // 8. Rate as "Good" - moves to next card
        await page.getByRole("button", { name: /good/i }).click();

        // 9. Verify now on Card 2
        await expect(page.getByText(/card 2 of 2/i)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });
        await expect(page.getByText(quiz.questions[1]!.question!)).toBeVisible();

        // 10. Flip and rate second card
        await page.getByRole("button", { name: "Reveal Answer", exact: true }).click();
        await expect(page.getByText(quiz.questions[1]!.explanation!)).toBeVisible({
            timeout: E2E_TIMEOUTS.ANIMATION,
        });
        await page.getByRole("button", { name: /good/i }).click();

        // 11. Verify session complete summary is shown
        await expect(page.getByText(/session complete/i)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // 12. Verify summary stats
        await expect(page.getByText(/mastery rate/i)).toBeVisible();
        await expect(page.getByText("100%")).toBeVisible();
        await expect(page.getByText(/2 cards reviewed/i)).toBeVisible();

        // 13. Verify "Back to Dashboard" button exists
        await expect(page.getByRole("button", { name: /back to dashboard/i })).toBeVisible();
    });

    test("handles 'Forgot' rating correctly", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // Seed quiz
        const quiz = await seedTestQuiz(TEST_QUIZ);
        await page.reload();
        await waitForDatabase(page);

        await page.goto(`/quiz/${quiz.id}/flashcard`);

        // Wait for first card
        await expect(page.getByText(quiz.questions[0]!.question!)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // Flip and rate as "Forgot"
        await page.getByRole("button", { name: "Reveal Answer", exact: true }).click();
        await page.getByRole("button", { name: /forgot/i }).click();

        // Move to second card
        await expect(page.getByText(quiz.questions[1]!.question!)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // Flip and rate second card as "Good"
        await page.getByRole("button", { name: "Reveal Answer", exact: true }).click();
        await page.getByRole("button", { name: /good/i }).click();

        // Verify summary shows mixed results
        await expect(page.getByText(/session complete/i)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // Should show 1 "Forgot" and 1 "Good"
        // The summary displays counts in colored boxes
        await expect(page.getByText(/mastery rate/i)).toBeVisible();
        await expect(page.getByText("50%")).toBeVisible(); // 1/2 = 50%
    });

    test("Exit button navigates back to dashboard", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        const quiz = await seedTestQuiz(TEST_QUIZ);
        await page.reload();
        await waitForDatabase(page);

        await page.goto(`/quiz/${quiz.id}/flashcard`);

        // Wait for card to load
        await expect(page.getByText(quiz.questions[0]!.question!)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // Click Exit button
        await page.getByRole("link", { name: /exit/i }).click();

        // Verify navigation to dashboard
        await expect(page).toHaveURL("/");
    });

    test("handles empty quiz gracefully", async ({
        authenticatedPage: page,
        seedTestQuiz,
    }) => {
        // Seed a quiz with no questions
        const emptyQuiz = await seedTestQuiz({
            id: "empty-quiz-test",
            title: "Empty Quiz",
            description: "Quiz with no questions",
            tags: [],
            questions: [],
            created_at: Date.now(),
            updated_at: Date.now(),
            version: 1,
            quiz_hash: "empty-hash",
            deleted_at: null,
            last_synced_at: null,
            last_synced_version: null,
        });
        await page.reload();
        await waitForDatabase(page);

        await page.goto(`/quiz/${emptyQuiz.id}/flashcard`);

        // Should show "No Questions" message
        await expect(page.getByText(/no questions/i)).toBeVisible({
            timeout: E2E_TIMEOUTS.LOADING,
        });

        // Should have button to go back
        await expect(page.getByRole("button", { name: /back to dashboard/i })).toBeVisible();
    });
});
