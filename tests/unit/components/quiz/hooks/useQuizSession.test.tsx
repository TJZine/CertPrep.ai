import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizSession } from "@/components/quiz/hooks/useQuizSession";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import type { Quiz } from "@/types/quiz";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

vi.mock("@/stores/quizSessionStore", () => ({
  useQuizSessionStore: vi.fn(),
  useCurrentQuestion: vi.fn(() => ({
    id: "q1",
    question: "Test question",
    options: { a: "A", b: "B" },
    category: "Test",
    explanation: "Because",
    correct_answer: "a",
  })),
}));

vi.mock("@/hooks/useTimer", () => ({
  useTimer: vi.fn(() => ({
    formattedTime: "00:00",
    start: vi.fn(),
    seconds: 0,
    pause: vi.fn(),
  })),
}));

vi.mock("@/hooks/useKeyboardNav", () => ({
  useKeyboardNav: vi.fn(),
  useSpacedRepetitionNav: vi.fn(),
}));

vi.mock("@/hooks/useCorrectAnswer", () => ({
  useCorrectAnswer: vi.fn(() => ({
    resolvedAnswers: { q1: "a" },
    isResolving: false,
  })),
}));

vi.mock("@/lib/quiz/quizRemix", () => ({
  remixQuiz: vi.fn(),
}));

vi.mock("@/db/srs", () => ({
  updateSRSState: vi.fn(),
}));

vi.mock("@/lib/srs", () => ({
  booleanToRating: vi.fn(),
}));

describe("useQuizSession", () => {
  const mockInitializeSession = vi.fn();
  const mockResetSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useQuizSessionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      initializeSession: mockInitializeSession,
      selectAnswer: vi.fn(),
      submitAnswer: vi.fn(),
      toggleExplanation: vi.fn(),
      toggleFlag: vi.fn(),
      markAgain: vi.fn(),
      markHard: vi.fn(),
      markGood: vi.fn(),
      resetSession: mockResetSession,
      currentIndex: 0,
      selectedAnswer: null,
      hasSubmitted: false,
      showExplanation: false,
      answers: new Map(),
      flaggedQuestions: new Set(),
      questionQueue: [{ id: "q1" }],
      questions: [{ id: "q1" }],
      isComplete: false,
    });
  });

  const mockQuiz = {
    id: "quiz-1",
    title: "Test Quiz",
    description: "A test quiz",
    topic: "Test",
    questions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "user-1",
    is_public: false,
  } as unknown as Quiz;

  it("initializes session correctly", async () => {
    const { result } = renderHook(() =>
      useQuizSession({
        quiz: mockQuiz,
        isSRSReview: false,
        effectiveUserId: "user-1",
      })
    );

    // Wait for the async initialization effect
    await vi.waitFor(() => {
        expect(mockInitializeSession).toHaveBeenCalledWith(
          "quiz-1",
          "zen",
          expect.any(Array)
        );
    });
    
    expect(result.current.isInitializing).toBe(false);
  });

  it("calculates progress and isCurrentAnswerCorrect accurately", async () => {
    (useQuizSessionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      initializeSession: mockInitializeSession,
      selectAnswer: vi.fn(),
      submitAnswer: vi.fn(),
      toggleExplanation: vi.fn(),
      toggleFlag: vi.fn(),
      markAgain: vi.fn(),
      markHard: vi.fn(),
      markGood: vi.fn(),
      resetSession: mockResetSession,
      showExplanation: false,
      flaggedQuestions: new Set(),
      isComplete: false,
      currentIndex: 5,
      questionQueue: new Array(10).fill({ id: "q" }),
      questions: new Array(10).fill({ id: "q" }),
      hasSubmitted: true,
      selectedAnswer: "a",
      answers: new Map([["q1", { selectedAnswer: "a", isCorrect: true }]]),
    });

    const { result } = renderHook(() =>
      useQuizSession({
        quiz: mockQuiz,
        isSRSReview: false,
        effectiveUserId: "user-1",
      })
    );

    await vi.waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.progress.current).toBe(6);
    expect(result.current.progress.total).toBe(10);
    expect(result.current.isCurrentAnswerCorrect).toBe(true);
  });
});
