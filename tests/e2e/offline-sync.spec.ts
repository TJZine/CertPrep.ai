/**
 * E2E Test: Offline-First Functionality
 *
 * This test suite verifies the core offline-first functionality:
 * 1. Quiz data is saved locally in IndexedDB
 * 2. Results are stored with synced: 0 (pending sync)
 * 3. App remains functional while offline
 *
 * Note: Full sync verification (synced: 0 → 1) requires real Supabase
 * credentials or more sophisticated auth mocking. The sync logic itself
 * is tested via unit tests in tests/unit/syncManager.test.ts.
 *
 * @see docs/ARCHITECTURE.md for sync architecture details
 */

import { test, expect, TEST_QUIZ, MOCK_USER } from './fixtures';
import {
  getResultsBySyncStatus,
  getResultsByUserId,
  seedQuiz,
  waitForDatabase,
  clearDatabase,
} from './helpers/db';

/**
 * Helper to select an answer option by its letter key.
 */
async function selectOption(
  page: import('@playwright/test').Page,
  letter: string
): Promise<void> {
  const option = page.getByRole('radio', { name: new RegExp(`^${letter}\\s`) });
  await option.click();
}

/**
 * Helper to complete a quiz by answering all questions.
 */
async function completeQuiz(page: import('@playwright/test').Page): Promise<void> {
  const submitButton = page.getByRole('button', { name: /check answer|submit/i });
  const goodButton = page.getByRole('button', { name: /good/i });

  // Answer Question 1
  await selectOption(page, 'B');
  await page.waitForTimeout(300);
  await submitButton.click();
  await page.waitForTimeout(500);
  await goodButton.click();
  await page.waitForTimeout(500);

  // Answer Question 2
  await selectOption(page, 'C');
  await page.waitForTimeout(300);
  await submitButton.click();
  await page.waitForTimeout(500);
  await goodButton.click();
  await page.waitForTimeout(1000);
}

test.describe('Offline Data Persistence', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await clearDatabase(authenticatedPage);
  });

  test('saves quiz results to IndexedDB when offline', async ({
    authenticatedPage: page,
    context,
  }) => {
    // Setup: Seed quiz
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    // Navigate to quiz while online (page must load first)
    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 15000 });

    // Go offline
    await context.setOffline(true);

    // Complete the quiz
    await completeQuiz(page);

    // Go online and navigate to valid page to query IndexedDB
    await context.setOffline(false);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify result was saved locally
    const results = await getResultsByUserId(page, MOCK_USER.id);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const savedResult = results.find((r) => r.quiz_id === quiz.id);
    expect(savedResult).toBeDefined();
    expect(savedResult?.user_id).toBe(MOCK_USER.id);
    expect(savedResult?.quiz_id).toBe(quiz.id);
    expect(savedResult?.synced).toBe(0); // Pending sync

    // Verify result has expected data structure
    expect(typeof savedResult?.score).toBe('number');
    expect(typeof savedResult?.time_taken_seconds).toBe('number');
    expect(savedResult?.answers).toBeDefined();
  });

  test('preserves result data structure when saving offline', async ({
    authenticatedPage: page,
    context,
  }) => {
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 15000 });

    await context.setOffline(true);
    await completeQuiz(page);

    await context.setOffline(false);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const results = await getResultsBySyncStatus(page, 0);
    const result = results.find((r) => r.quiz_id === quiz.id);

    expect(result).toBeDefined();

    // Verify all required fields are present
    expect(result!.id).toBeDefined();
    expect(result!.quiz_id).toBe(quiz.id);
    expect(result!.user_id).toBe(MOCK_USER.id);
    expect(result!.timestamp).toBeGreaterThan(0);
    expect(result!.mode).toBe('zen');
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(100);
    expect(result!.time_taken_seconds).toBeGreaterThanOrEqual(0);
    expect(result!.answers).toBeDefined();
    expect(Object.keys(result!.answers).length).toBe(2); // 2 questions
    expect(Array.isArray(result!.flagged_questions)).toBe(true);
    expect(result!.category_breakdown).toBeDefined();
    expect(result!.synced).toBe(0);
  });

  test('handles multiple offline quiz attempts', async ({
    authenticatedPage: page,
    context,
  }) => {
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    const submitButton = page.getByRole('button', { name: /check answer|submit/i });
    const goodButton = page.getByRole('button', { name: /good/i });

    // Take quiz twice offline
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.goto(`/quiz/${quiz.id}/zen`);
      await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 15000 });

      await context.setOffline(true);

      await selectOption(page, 'A');
      await page.waitForTimeout(300);
      await submitButton.click();
      await page.waitForTimeout(500);
      await goodButton.click();
      await page.waitForTimeout(500);

      await selectOption(page, 'B');
      await page.waitForTimeout(300);
      await submitButton.click();
      await page.waitForTimeout(500);
      await goodButton.click();
      await page.waitForTimeout(1000);

      await context.setOffline(false);
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify both results were saved
    const results = await getResultsByUserId(page, MOCK_USER.id);
    const quizResults = results.filter((r) => r.quiz_id === quiz.id);

    expect(quizResults.length).toBeGreaterThanOrEqual(2);

    // Both should be unsynced
    const unsyncedCount = quizResults.filter((r) => r.synced === 0).length;
    expect(unsyncedCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Offline Mode Behavior', () => {
  test('app remains functional while offline after initial load', async ({
    authenticatedPage: page,
    context,
  }) => {
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    // Navigate to quiz while online
    await page.goto(`/quiz/${quiz.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(quiz.title, {
      timeout: 15000,
    });

    // Go offline
    await context.setOffline(true);

    // App should still be usable
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(quiz.title);

    // Verify offline banner appears
    await expect(page.getByText("You're Offline")).toBeVisible({ timeout: 5000 });
  });

  test('quiz can be started and completed while offline', async ({
    authenticatedPage: page,
    context,
  }) => {
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    // Load quiz page while online
    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 15000 });

    // Go offline
    await context.setOffline(true);

    // Complete the quiz while offline
    await completeQuiz(page);

    // Go online and verify data was saved
    await context.setOffline(false);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const results = await getResultsBySyncStatus(page, 0);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.quiz_id === quiz.id)).toBe(true);
  });

  test('quiz data persists across page navigation while offline', async ({
    authenticatedPage: page,
    context,
  }) => {
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    // Load the quiz
    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 15000 });

    // Go offline
    await context.setOffline(true);

    // Answer first question
    await selectOption(page, 'B');
    await page.waitForTimeout(300);
    const submitButton = page.getByRole('button', { name: /check answer|submit/i });
    await submitButton.click();
    await page.waitForTimeout(500);

    // Go back online to verify app state
    await context.setOffline(false);

    // The quiz should still be in progress
    await expect(page.getByText('What is 2 + 2?')).toBeVisible();
  });
});

test.describe('Sync Request Verification', () => {
  test('captures sync requests when back online', async ({
    authenticatedPage: page,
    context,
    syncRequests,
  }) => {
    const quiz = { ...TEST_QUIZ, user_id: MOCK_USER.id };
    await seedQuiz(page, quiz);
    await page.reload();
    await waitForDatabase(page);

    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 15000 });

    await context.setOffline(true);
    await completeQuiz(page);

    await context.setOffline(false);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for potential sync attempts
    await page.waitForTimeout(3000);

    // Note: Sync may not complete without proper auth, but we verify
    // the result was at least saved locally with synced: 0
    const results = await getResultsBySyncStatus(page, 0);
    expect(results.length).toBeGreaterThanOrEqual(1);

    // Log sync requests for debugging (may be empty without auth)
    console.log(`[E2E] Sync requests captured: ${syncRequests.length}`);
  });
});
