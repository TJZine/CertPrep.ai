/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixtures use `use` which isn't a React hook */
import {
  test as base,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { injectAuthState, MOCK_USER } from "./auth";
import { clearDatabase, seedQuiz, waitForDatabase } from "../helpers/db";
import type { Quiz } from "../../../src/types/quiz";

/**
 * Extended test fixtures for CertPrep.ai E2E tests.
 */
export interface TestFixtures {
  /** Page with authentication already injected */
  authenticatedPage: Page;

  /** Browser context with Supabase API routes mocked */
  mockedContext: BrowserContext;

  /** Helper to seed a quiz for the authenticated user */
  seedTestQuiz: (quiz: Omit<Quiz, "user_id">) => Promise<Quiz>;

  /** Captured sync requests for assertions */
  syncRequests: { body: unknown; url: string }[];
}

/**
 * Sets up all Supabase route mocking for E2E tests.
 * This intercepts all API calls and returns appropriate mock responses.
 */
async function setupSupabaseMocks(
  context: BrowserContext,
  syncRequests: { body: unknown; url: string }[],
): Promise<void> {
  // Mock Supabase auth endpoints are REMOVED to allow real auth via storageState
  // We only mock the data endpoints to prevent polluting the real database
  // and to allow verifying sync requests.

  // Note: If we needed to mock auth, we would do it here.
  // But since we are using real Supabase Auth with a test user,
  // we let those requests pass through to the real backend.

  // Mock Supabase REST API - results endpoint
  // This handles both push (POST) and pull (GET) operations
  // Use * at the end to match query parameters
  await context.route("**/rest/v1/results*", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "GET") {
      // Return empty array for pull sync - no remote results to download
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
        headers: {
          "Content-Range": "0-0/0",
        },
      });
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
      // Capture the sync request for assertions
      try {
        const body = request.postDataJSON();
        syncRequests.push({ body, url });
      } catch {
        syncRequests.push({ body: request.postData(), url });
      }

      // Return success for push sync
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }

  });

  // Mock Supabase REST API - quizzes endpoint
  await context.route("**/rest/v1/quizzes*", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "GET") {
      // Return empty array for pull sync
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
        headers: {
          "Content-Range": "0-0/0",
        },
      });
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
      // Capture the sync request
      try {
        const body = request.postDataJSON();
        syncRequests.push({ body, url });
      } catch {
        syncRequests.push({ body: request.postData(), url });
      }

      // Return success for push sync
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Remove the catch-all route that was shadowing the results route
  // If we need to mock other endpoints, we should add specific routes or a careful catch-all
  // For now, let other requests pass through (they will fail if offline, which is correct)
}

/**
 * Extended Playwright test with CertPrep.ai specific fixtures.
 */
export const test = base.extend<TestFixtures>({
  /**
   * Captures sync requests made to Supabase for verification.
   * This must be defined before authenticatedPage since it's a dependency.
   */
  syncRequests: async ({ context }, use) => {
    const requests: { body: unknown; url: string }[] = [];

    // Set up all Supabase mocks with request capture
    await setupSupabaseMocks(context, requests);

    await use(requests);
  },

  /**
   * Provides a page with mock authentication already set up.
   * Use this fixture when you need a logged-in user.
   */
  authenticatedPage: async ({ page, syncRequests }, use) => {
    // syncRequests fixture already set up the mocks
    void syncRequests;

    // Inject auth state into the page
    await injectAuthState(page);

    // Wait for the database to initialize
    await waitForDatabase(page);

    // Clear any existing data for test isolation
    await clearDatabase(page);

    // Provide the authenticated page to the test
    await use(page);
  },

  /**
   * Provides a browser context with Supabase routes mocked.
   * Useful for tests that need low-level context control.
   */
  mockedContext: async ({ context, syncRequests }, use) => {
    void syncRequests;
    await use(context);
  },

  /**
   * Helper fixture to seed a quiz for the mock user.
   * Returns the quiz with user_id populated.
   */
  seedTestQuiz: async ({ authenticatedPage }, use) => {
    const seeder = async (quizData: Omit<Quiz, "user_id">): Promise<Quiz> => {
      const quiz: Quiz = {
        ...quizData,
        user_id: MOCK_USER.id,
      };

      await seedQuiz(authenticatedPage, quiz);
      return quiz;
    };

    await use(seeder);
  },
});

/**
 * Re-export expect for convenience.
 */
export { expect };

/**
 * Re-export MOCK_USER for use in tests.
 */
export { MOCK_USER };

/**
 * Sample quiz data for testing.
 * Minimal quiz with 2 questions for fast test execution.
 */
export const TEST_QUIZ: Omit<Quiz, "user_id"> = {
  id: "e2e-test-quiz-001",
  title: "E2E Test Quiz",
  description: "A minimal quiz for E2E testing",
  tags: ["e2e", "test"],
  questions: [
    {
      id: "q1",
      category: "Testing",
      difficulty: "Easy",
      question: "What is 2 + 2?",
      options: {
        A: "3",
        B: "4",
        C: "5",
        D: "6",
      },
      correct_answer: "B",
      explanation: "Basic arithmetic: 2 + 2 = 4",
    },
    {
      id: "q2",
      category: "Testing",
      difficulty: "Easy",
      question: "What color is the sky on a clear day?",
      options: {
        A: "Green",
        B: "Red",
        C: "Blue",
        D: "Yellow",
      },
      correct_answer: "C",
      explanation: "The sky appears blue due to Rayleigh scattering.",
    },
  ],
  created_at: Date.now(),
  updated_at: Date.now(),
  version: 1,
  quiz_hash: "e2e-test-hash-001",
  deleted_at: null,
  last_synced_at: null,
  last_synced_version: null,
};
