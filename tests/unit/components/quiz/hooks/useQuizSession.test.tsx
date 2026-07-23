import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizSession } from "@/components/quiz/hooks/useQuizSession";
import {
  useZenDraftSession,
  type ZenDraftDecision,
} from "@/components/quiz/hooks/useZenDraftSession";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import type { Quiz } from "@/types/quiz";

const timerMocks = vi.hoisted(() => ({
  start: vi.fn(),
  pause: vi.fn(),
  reset: vi.fn(),
}));

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
    start: timerMocks.start,
    seconds: 0,
    pause: timerMocks.pause,
    reset: timerMocks.reset,
  })),
}));

vi.mock("@/components/quiz/hooks/useZenDraftSession", () => ({
  useZenDraftSession: vi.fn(() => ({
    isInitializing: false,
    decision: null,
    saveStatus: "idle",
    saveMessage: null,
    draftOwnerId: null,
    resume: vi.fn(),
    startOver: vi.fn(),
    resumeAsNewAttempt: vi.fn(),
    flushDraft: vi.fn().mockResolvedValue(true),
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
    vi.mocked(useZenDraftSession).mockReturnValue({
      isInitializing: false,
      decision: null,
      saveStatus: "idle",
      saveMessage: null,
      draftOwnerId: null,
      resume: vi.fn(),
      startOver: vi.fn(),
      resumeAsNewAttempt: vi.fn(),
      flushDraft: vi.fn().mockResolvedValue(true),
    });
    (
      useQuizSessionStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
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
      }),
    );

    // Wait for the async initialization effect
    await vi.waitFor(() => {
      expect(mockInitializeSession).toHaveBeenCalledWith(
        "quiz-1",
        "zen",
        expect.any(Array),
      );
    });

    expect(result.current.isInitializing).toBe(false);
  });

  it("calculates progress and isCurrentAnswerCorrect accurately", async () => {
    (
      useQuizSessionStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
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
      }),
    );

    await vi.waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.progress.current).toBe(6);
    expect(result.current.progress.total).toBe(10);
    expect(result.current.isCurrentAnswerCorrect).toBe(true);
  });

  it("does not reset a non-draft session for metadata-only quiz refreshes", async () => {
    const { result, rerender } = renderHook(
      ({ currentQuiz }: { currentQuiz: Quiz }) =>
        useQuizSession({
          quiz: currentQuiz,
          isSRSReview: false,
          effectiveUserId: "user-1",
        }),
      { initialProps: { currentQuiz: mockQuiz } },
    );

    await vi.waitFor(() => expect(result.current.isInitializing).toBe(false));
    mockInitializeSession.mockClear();
    mockResetSession.mockClear();

    rerender({ currentQuiz: { ...mockQuiz, last_synced_at: Date.now() } });
    await Promise.resolve();

    expect(mockResetSession).not.toHaveBeenCalled();
    expect(mockInitializeSession).not.toHaveBeenCalled();
  });

  it("does not advance progress until the current question is submitted and reaches total on completion", async () => {
    let storeState = {
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
      hasSubmitted: false,
      selectedAnswer: "a" as string | null,
      answers: new Map(),
    };

    (
      useQuizSessionStore as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => storeState);

    const { result, rerender } = renderHook(() =>
      useQuizSession({
        quiz: mockQuiz,
        isSRSReview: false,
        effectiveUserId: "user-1",
      }),
    );

    await vi.waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.progress.current).toBe(5);
    expect(result.current.progress.total).toBe(10);

    storeState = {
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
      isComplete: true,
      currentIndex: 9,
      questionQueue: new Array(10).fill({ id: "q" }),
      questions: new Array(10).fill({ id: "q" }),
      hasSubmitted: false,
      selectedAnswer: null as string | null,
      answers: new Map(),
    };

    rerender();

    expect(result.current.progress.current).toBe(10);
    expect(result.current.progress.total).toBe(10);
  });

  it("maps the complete Zen draft contract without wrapping its handlers", () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const startOver = vi.fn().mockResolvedValue(undefined);
    const resumeAsNewAttempt = vi.fn().mockResolvedValue(undefined);
    const flushDraft = vi.fn().mockResolvedValue(true);
    const decision = {
      kind: "resume",
      assessment: {
        compatibility: "resumable",
        draft: { revision: 3 },
      },
    } as unknown as ZenDraftDecision;
    vi.mocked(useZenDraftSession).mockReturnValue({
      isInitializing: true,
      decision,
      saveStatus: "conflict",
      saveMessage: "A newer tab owns this draft.",
      draftOwnerId: "writer-3",
      resume,
      startOver,
      resumeAsNewAttempt,
      flushDraft,
    });

    const { result } = renderHook(() =>
      useQuizSession({
        quiz: mockQuiz,
        isSRSReview: false,
        effectiveUserId: "user-1",
        draftEligible: true,
      }),
    );

    expect(result.current.isInitializing).toBe(true);
    expect(result.current.draftDecision).toBe(decision);
    expect(result.current.draftSaveStatus).toBe("conflict");
    expect(result.current.draftSaveMessage).toBe(
      "A newer tab owns this draft.",
    );
    expect(result.current.draftOwnerId).toBe("writer-3");
    expect(result.current.resumeDraft).toBe(resume);
    expect(result.current.startOverDraft).toBe(startOver);
    expect(result.current.resumeDraftAsNewAttempt).toBe(resumeAsNewAttempt);
    expect(result.current.flushDraft).toBe(flushDraft);
  });
});
