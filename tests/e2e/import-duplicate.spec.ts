/**
 * E2E Test: Import Duplicate Detection
 *
 * Tests the warning UI when importing a quiz with a title that already exists.
 */

import { test, expect, TEST_QUIZ } from "./fixtures";
import { waitForDatabase, getAllQuizzes } from "./helpers/db";
import { E2E_TIMEOUTS } from "./helpers/timeouts";

test.describe("Import Duplicate Detection", () => {
    test.beforeEach(async ({ authenticatedPage: page, seedTestQuiz }) => {
        // Seed an existing quiz
        await seedTestQuiz({ ...TEST_QUIZ, title: "Duplicate Test Quiz" });
        await page.reload();
        await waitForDatabase(page);
    });

    test("shows warning when importing quiz with same title", async ({
        authenticatedPage: page,
    }) => {
        // Navigate to dashboard
        await page.goto("/");
        await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

        // Open import modal
        await page.getByRole("button", { name: /import/i }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();

        // Paste JSON with matching title
        const duplicateJson = JSON.stringify({
            title: "Duplicate Test Quiz",
            description: "A quiz that already exists",
            questions: [
                {
                    id: "new-q1",
                    question: "New question?",
                    options: { A: "Answer A", B: "Answer B" },
                    correct_answer: "A",
                    explanation: "A is correct",
                    category: "Test",
                },
            ],
        });

        await page.getByRole("textbox", { name: /quiz json/i }).fill(duplicateJson);

        // Wait for validation
        await expect(page.getByText(/validation passed/i)).toBeVisible();

        // Click Import button
        await page.getByRole("dialog").getByRole("button", { name: "Import Quiz" }).click();

        // Should see duplicate warning
        await expect(page.getByText("Quiz Already Exists")).toBeVisible();
        await expect(page.getByText(/already exists with/i)).toBeVisible();

        // Should show action buttons
        await expect(page.getByRole("alert").getByRole("button", { name: "Import as New" })).toBeVisible();
        await expect(page.getByRole("alert").getByRole("button", { name: "Replace Existing" })).toBeVisible();
        await expect(page.getByRole("alert").getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    test("Import as New creates second quiz with same title", async ({
        authenticatedPage: page,
    }) => {
        await page.goto("/");
        await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

        // Open import modal
        await page.getByRole("button", { name: /import/i }).first().click();

        // Paste JSON with matching title
        const duplicateJson = JSON.stringify({
            title: "Duplicate Test Quiz",
            description: "Second version",
            questions: [
                {
                    id: "new-q1",
                    question: "Different question?",
                    options: { A: "A", B: "B" },
                    correct_answer: "B",
                    explanation: "B is correct",
                    category: "Test",
                },
            ],
        });

        await page.getByRole("textbox", { name: /quiz json/i }).fill(duplicateJson);
        await expect(page.getByText(/validation passed/i)).toBeVisible();
        await page.getByRole("dialog").getByRole("button", { name: "Import Quiz" }).click();

        // Click "Import as New"
        await page.getByRole("alert").getByRole("button", { name: "Import as New" }).click();

        // Modal should close and success toast should appear
        await expect(page.getByRole("dialog")).not.toBeVisible();

        // Verify two quizzes exist with same title
        await expect.poll(async () => {
            const quizzes = await getAllQuizzes(page);
            return quizzes.filter(q => q.title === "Duplicate Test Quiz" && !q.deleted_at).length;
        }, {
            message: "Should have 2 quizzes with the same title",
            timeout: E2E_TIMEOUTS.LOADING,
        }).toBe(2);
    });

    test("Replace Existing updates original quiz", async ({
        authenticatedPage: page,
    }) => {
        await page.goto("/");
        await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

        // Get original quiz count
        const originalQuizzes = await getAllQuizzes(page);
        const originalCount = originalQuizzes.filter(q => !q.deleted_at).length;

        // Open import modal
        await page.getByRole("button", { name: /import/i }).first().click();

        // Paste JSON with matching title but different content
        const duplicateJson = JSON.stringify({
            title: "Duplicate Test Quiz",
            description: "Replaced version",
            questions: [
                {
                    id: "replaced-q1",
                    question: "Replaced question?",
                    options: { A: "New A", B: "New B", C: "New C" },
                    correct_answer: "C",
                    explanation: "C is correct",
                    category: "Replaced",
                },
            ],
        });

        await page.getByRole("textbox", { name: /quiz json/i }).fill(duplicateJson);
        await expect(page.getByText(/validation passed/i)).toBeVisible();
        await page.getByRole("dialog").getByRole("button", { name: "Import Quiz" }).click();

        // Click "Replace Existing"
        await page.getByRole("alert").getByRole("button", { name: "Replace Existing" }).click();

        // Modal should close and success toast should appear
        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(page.getByText(/replaced.*with new version/i)).toBeVisible();

        // Verify quiz count is unchanged (replaced, not added)
        await expect.poll(async () => {
            const quizzes = await getAllQuizzes(page);
            return quizzes.filter(q => !q.deleted_at).length;
        }, {
            message: "Quiz count should be unchanged",
            timeout: E2E_TIMEOUTS.LOADING,
        }).toBe(originalCount);

        // Verify the quiz was updated with new content
        await expect.poll(async () => {
            const quizzes = await getAllQuizzes(page);
            const updated = quizzes.find(q => q.title === "Duplicate Test Quiz" && !q.deleted_at);
            return updated?.questions[0]?.question;
        }, {
            message: "Quiz should have updated question",
            timeout: E2E_TIMEOUTS.LOADING,
        }).toBe("Replaced question?");
    });

    test("Cancel dismisses warning without importing", async ({
        authenticatedPage: page,
    }) => {
        await page.goto("/");
        await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

        // Get original quiz count
        const originalQuizzes = await getAllQuizzes(page);
        const originalCount = originalQuizzes.filter(q => !q.deleted_at).length;

        // Open import modal
        await page.getByRole("button", { name: /import/i }).first().click();

        // Paste JSON with matching title
        const duplicateJson = JSON.stringify({
            title: "Duplicate Test Quiz",
            description: "Should not be imported",
            questions: [
                {
                    id: "cancel-q1",
                    question: "Cancel question?",
                    options: { A: "A", B: "B" },
                    correct_answer: "A",
                    explanation: "A",
                    category: "Test",
                },
            ],
        });

        await page.getByRole("textbox", { name: /quiz json/i }).fill(duplicateJson);
        await expect(page.getByText(/validation passed/i)).toBeVisible();
        await page.getByRole("dialog").getByRole("button", { name: "Import Quiz" }).click();

        // Click "Cancel"
        await page.getByRole("alert").getByRole("button", { name: "Cancel" }).click();

        // Warning should dismiss but modal stays open
        await expect(page.getByText("Quiz Already Exists")).not.toBeVisible();
        await expect(page.getByRole("dialog")).toBeVisible();

        // Close modal
        await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

        // Verify quiz count is unchanged
        await expect.poll(async () => {
            const quizzes = await getAllQuizzes(page);
            return quizzes.filter(q => !q.deleted_at).length;
        }, {
            message: "Quiz count should be unchanged after cancel",
            timeout: E2E_TIMEOUTS.LOADING,
        }).toBe(originalCount);
    });
});
