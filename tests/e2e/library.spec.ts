import { test, expect, TEST_QUIZ } from "./fixtures";
import {
    waitForDatabase,
    getAllQuizzes,
} from "./helpers/db";
import { E2E_TIMEOUTS } from "./helpers/timeouts";

test.describe("Quiz Library & Dashboard", () => {
    test.beforeEach(async () => {
        // Database cleared by fixture
    });

    test.describe("Library Page", () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            // Mock the library manifest
            await page.route("/tests/index.json", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        tests: [
                            {
                                id: "mock-quiz-1",
                                title: "Mock Library Quiz",
                                description: "A mock quiz for library testing",
                                category: "Testing",
                                path: "/tests/mock-quiz.json",
                            },
                        ],
                    }),
                });
            });
        });

        test("displays library heading and description", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/library");

            // Wait for loading to finish
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            // 2. Verify "Test Library" heading
            await expect(
                page.getByRole("heading", { name: "Test Library", exact: true }),
            ).toBeVisible();
        });

        test("shows available quizzes from manifest", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/library");

            // Wait for loading to finish
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            // Check that valid quiz cards are present
            await expect(page.getByText("Mock Library Quiz")).toBeVisible();
            await expect(page.getByText("A mock quiz for library testing")).toBeVisible();
        });
    });

    test.describe("Category Filtering", () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            // Mock with 2 categories
            await page.route("/tests/index.json", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        tests: [
                            {
                                id: "cat-a-quiz",
                                title: "Quiz A",
                                description: "Description A",
                                category: "Category A",
                                path: "/tests/a.json",
                            },
                            {
                                id: "cat-b-quiz",
                                title: "Quiz B",
                                description: "Description B",
                                category: "Category B",
                                path: "/tests/b.json",
                            },
                        ],
                    }),
                });
            });
        });

        test("defaults to all category", async ({ authenticatedPage: page }) => {
            await page.goto("/library");
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            // Expect All to be selected by default
            const tabAll = page.getByRole("tab", { name: "All" });
            const tabA = page.getByRole("tab", { name: "Category A" });
            const tabB = page.getByRole("tab", { name: "Category B" });

            await expect(tabAll).toHaveAttribute("aria-selected", "true");
            await expect(tabA).toHaveAttribute("aria-selected", "false");
            await expect(tabB).toHaveAttribute("aria-selected", "false");

            await expect(page.getByRole("heading", { name: "Quiz A" })).toBeVisible();
            await expect(page.getByRole("heading", { name: "Quiz B" })).toBeVisible();
        });

        test("can switch categories", async ({ authenticatedPage: page }) => {
            await page.goto("/library");
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            await page.getByRole("tab", { name: "Category B" }).click();

            const tabA = page.getByRole("tab", { name: "Category A" });
            const tabB = page.getByRole("tab", { name: "Category B" });

            await expect(tabB).toHaveAttribute("aria-selected", "true");
            await expect(tabA).toHaveAttribute("aria-selected", "false");

            await expect(page.getByRole("heading", { name: "Quiz B" })).toBeVisible();
            await expect(page.getByRole("heading", { name: "Quiz A" })).not.toBeVisible();
        });

        test("persists selection in URL", async ({ authenticatedPage: page }) => {
            await page.goto("/library");
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            await page.getByRole("tab", { name: "Category B" }).click();
            await expect(page).toHaveURL(/category=Category(%20|\+)B/);
        });

        test("respects URL param on load", async ({ authenticatedPage: page }) => {
            await page.goto("/library?category=Category B");
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            const tabB = page.getByRole("tab", { name: "Category B" });
            await expect(tabB).toHaveAttribute("aria-selected", "true");
            await expect(page.getByRole("heading", { name: "Quiz B" })).toBeVisible();
        });
    });

    test.describe("Quiz Import", () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            // Mock the library manifest
            await page.route("/tests/index.json", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        tests: [
                            {
                                id: "import-test-quiz",
                                title: "Import Test Quiz",
                                description: "Quiz for import testing",
                                category: "Testing",
                                path: "/tests/import-quiz.json",
                            },
                        ],
                    }),
                });
            });

            // Mock the specific quiz file
            await page.route("/tests/import-quiz.json", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        title: "Import Test Quiz",
                        description: "Quiz for import testing",
                        questions: [
                            {
                                id: "q1",
                                type: "multiple_choice",
                                question: "Question 1",
                                options: { A: "Opt A", B: "Opt B" },
                                correct_answer: "A",
                                explanation: "Exp 1",
                                category: "General",
                                difficulty: "Easy"
                            }
                        ],
                    }),
                });
            });
        });

        test("imports quiz from library", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/library");

            // 2. Find a quiz card with "Import" button
            const importButton = page.getByRole("button", { name: "Import" }).first();

            // It should be visible now that we mocked it
            await expect(importButton).toBeVisible();
            await importButton.click();

            // 4. Verify success toast appears
            await expect(page.getByText(/imported successfully/i)).toBeVisible();

            // 5. Verify button changes to "Imported" (disabled)
            await expect(page.getByRole("button", { name: "Imported" })).toBeVisible();

            // Verify logic persistence immediately
            await expect.poll(async () => {
                const quizzes = await getAllQuizzes(page);
                const imported = quizzes.find(q => q.title === "Import Test Quiz");
                if (!imported) test.info().annotations.push({ type: "debug", description: JSON.stringify(quizzes, null, 2) });
                return imported;
            }, {
                message: "Quiz should be persisted in IndexedDB",
                timeout: 5000,
            }).toBeDefined();

            // 6. Navigate to / (dashboard)
            await page.goto("/");

            // Wait for loading to finish - Use explicit text from DashboardPage
            await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible();

            // 7. Verify import quiz appears in user's library using Heading for stability
            await expect(page.getByRole("heading", { name: "Import Test Quiz" })).toBeVisible();
        });

        test("prevents duplicate imports", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/library");

            // Import once
            const importButton = page.getByRole("button", { name: "Import" }).first();
            await expect(importButton).toBeVisible();
            await importButton.click();
            await expect(page.getByText(/imported successfully/i)).toBeVisible();

            // Reload to check persistence of state
            await page.reload();
            await expect(page.getByText(/loading/i).first()).not.toBeVisible();

            // Verify button is now "Imported" (disabled)
            const importedButton = page.getByRole("button", { name: "Imported" }).first();
            await expect(importedButton).toBeVisible();
            await expect(importedButton).toBeDisabled();
        });
    });

    test.describe("Dashboard Quiz List", () => {
        test("displays user's imported quizzes", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            // 1. Seed 2 quizzes
            // 1. Seed 2 quizzes
            await seedTestQuiz({ ...TEST_QUIZ, id: "q1", title: "Quiz One" });
            await seedTestQuiz({ ...TEST_QUIZ, id: "q2", title: "Quiz Two" });

            await page.reload();
            await waitForDatabase(page);

            await page.goto("/");

            // Wait for loading to finish
            await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible();

            // 3. Verify both quiz cards are visible
            await expect(page.getByRole("heading", { name: "Quiz One", exact: true })).toBeVisible();
            await expect(page.getByRole("heading", { name: "Quiz Two", exact: true })).toBeVisible();
        });

        test("clicking quiz card starts quiz flow", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            test.slow(); // Auth test usually slower
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await page.reload();
            await waitForDatabase(page);

            await page.goto("/");

            // Wait for loading to finish
            await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible();

            // 3. Click the Start Quiz button
            await expect(page.getByRole("heading", { name: quiz.title })).toBeVisible();

            await page
                .getByRole("button", { name: /start quiz/i })
                .first()
                .click({ force: true });

            // 4. Verify Mode Selection Modal appears
            await expect(page.getByRole("dialog")).toBeVisible();
            await expect(page.getByText("Select Study Mode")).toBeVisible();

            // 5. Select Zen functionality (default) and start
            await page.getByRole("button", { name: /start study/i }).click();

            // 6. Verify URL is /quiz/[id]/zen
            await expect(page).toHaveURL(new RegExp(`/quiz/${quiz.id}/zen`));
        });

        test("shows empty state when no quizzes", async ({
            authenticatedPage: page,
        }) => {
            // DB is cleared by beforeEach
            await page.goto("/");


            // Wait for loading to finish (wait for either content or empty state)
            await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });

            // 3. Verify empty state
            await expect(page.getByRole("heading", { name: "No quizzes yet" })).toBeVisible();
            await expect(page.getByText("Import your first quiz to get started", { exact: true })).toBeVisible();
        });

        test("can delete a quiz", async ({
            authenticatedPage: page,
            seedTestQuiz,
        }) => {
            // 1. Seed a quiz
            const quiz = await seedTestQuiz(TEST_QUIZ);
            await page.reload();
            await waitForDatabase(page);

            await page.goto("/");

            // Wait for loading
            await expect(page.getByText("Loading your quiz library...").first()).not.toBeVisible();

            // Verify quiz is present
            await expect(page.getByRole("heading", { name: quiz.title })).toBeVisible();

            // 2. Click Option Menu button
            // The Card has a "MoreVertical" icon button with ARIA label "Quiz options"
            const optionsButton = page.getByLabel("Quiz options").first();
            await optionsButton.click();

            // 3. Click Delete in the dropdown menu
            const deleteMenuItem = page.getByRole("menuitem", { name: /delete/i });
            await deleteMenuItem.click();

            // 4. Confirm deletion in modal
            // "Delete Quiz" is the button text in DeleteConfirmModal footer
            await expect(page.getByRole("dialog")).toBeVisible();
            await page.getByRole("button", { name: "Delete Quiz" }).click();

            // 5. Verify quiz is removed
            await expect(page.getByRole("heading", { name: quiz.title })).not.toBeVisible();

            // 6. Sync check - ensure it's gone from DB
            await expect.poll(async () => {
                const quizzes = await getAllQuizzes(page); // Returns raw DB dump
                // Filter out soft-deleted quizzes
                return quizzes.filter(q => !q.deleted_at).length;
            }, {
                message: "Quiz count should be 0",
                timeout: 5000,
            }).toBe(0);
        });
    });
});
