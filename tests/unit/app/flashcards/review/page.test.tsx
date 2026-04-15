/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Hoist all mock functions
const {
  mockPush,
  mockGetDue,
  mockGetSession,
  mockClearSession,
  mockHydrateAggregatedQuiz,
  mockUseAuth,
  mockUseEffectiveUserId,
  mockUseInitializeDatabase,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetDue: vi.fn(),
  mockGetSession: vi.fn(),
  mockClearSession: vi.fn(),
  mockHydrateAggregatedQuiz: vi.fn(),
  mockUseAuth: vi.fn((): { user: { id: string } | null } => ({
    user: { id: "user-1" },
  })),
  mockUseEffectiveUserId: vi.fn(
    (id: string | undefined): string | null => id ?? null,
  ),
  mockUseInitializeDatabase: vi.fn(
    (): { isInitialized: boolean; error: Error | null } => ({
      isInitialized: true,
      error: null,
    }),
  ),
}));

// 2. Define mocks using hoisted functions
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: mockUseEffectiveUserId,
}));

vi.mock("@/hooks/useDatabase", () => ({
  useInitializeDatabase: mockUseInitializeDatabase,
}));

vi.mock("@/db/aggregatedQuiz", () => ({
  hydrateAggregatedQuiz: mockHydrateAggregatedQuiz,
}));

vi.mock("@/db/srs", () => ({
  getDueQuestions: mockGetDue,
}));

vi.mock("@/lib/flashcardStorage", () => ({
  getFlashcardSession: mockGetSession,
  clearFlashcardSession: mockClearSession,
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  Layers: () => <div data-testid="layers" />,
}));

vi.mock("@/components/flashcard", () => ({
  FlashcardContainer: ({ quiz }: { quiz: { title: string } }) => (
    <div data-testid="flashcard-container">{quiz.title}</div>
  ),
}));

vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ text }: { text: string }) => <div>{text}</div>,
}));

import FlashcardReviewPage from "@/app/flashcards/review/page";

describe("FlashcardReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockReturnValue(null);
    mockGetDue.mockResolvedValue([]);
    mockHydrateAggregatedQuiz.mockResolvedValue({
      syntheticQuiz: {
        id: "flashcard-review-aggregate",
        title: "Flashcard Review",
        description: "Spaced repetition flashcard review session",
        questions: [{ id: "q1" }],
        tags: [],
        created_at: 1,
        user_id: "user-1",
        version: 1,
      },
      sourceQuizByQuestionId: new Map([["q1", { id: "quiz-1" }]]),
      sourceMap: { q1: "quiz-1" },
      missingQuestionIds: [],
    });
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      session: null,
      isLoading: false,
      signOut: vi.fn().mockResolvedValue(undefined),
    } as any);
    mockUseEffectiveUserId.mockImplementation(
      (id: string | undefined) => id ?? null,
    );
    mockUseInitializeDatabase.mockReturnValue({
      isInitialized: true,
      error: null,
    });
  });

  it("shows the loading spinner when initializing", () => {
    mockUseInitializeDatabase.mockReturnValueOnce({
      isInitialized: false,
      error: null,
    });

    render(<FlashcardReviewPage />);
    expect(screen.getByText(/Preparing Flashcard Review/i)).toBeDefined();
  });

  it("shows 'All Caught Up' when there are no due questions", async () => {
    mockGetDue.mockResolvedValueOnce([]);

    render(<FlashcardReviewPage />);

    await waitFor(() => {
      expect(screen.getByText("All Caught Up!")).toBeDefined();
    });
  });
});
