import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import type { Quiz } from "@/types/quiz";

// Mock the hooks
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock("@/stores/quizSessionStore", () => ({
  useQuizSessionStore: vi.fn(),
}));

vi.mock("@/hooks/useBeforeUnload", () => ({
  useBeforeUnload: vi.fn(),
}));

vi.mock("@/components/quiz/hooks/useQuizPersistence", () => ({
  useQuizPersistence: vi.fn(() => ({
    saveError: null,
    submitQuiz: vi.fn(),
    retrySave: vi.fn(),
    clearSessionStorage: vi.fn(),
    effectiveUserId: "user-1",
  })),
}));

vi.mock("@/components/quiz/hooks/useQuizSession", () => ({
  useQuizSession: vi.fn(() => ({
    isInitializing: false,
    currentQuestion: {
      id: "q1",
      question: "Test Question?",
      options: { a: "A", b: "B" },
      explanation: "Exp",
      correct_answer: "a",
    },
    currentIndex: 0,
    progress: { current: 1, total: 10 },
    selectedAnswer: null,
    hasSubmitted: false,
    showExplanation: false,
    isComplete: false,
    formattedTime: "00:00",
    seconds: 0,
    pauseTimer: vi.fn(),
    isResolving: false,
    currentCorrectAnswer: "a",
    isCurrentAnswerCorrect: false,
    isLastQuestion: false,
    selectAnswer: vi.fn(),
    submitAnswer: vi.fn(),
    toggleExplanation: vi.fn(),
    toggleFlag: vi.fn(),
    markAgain: vi.fn(),
    markHard: vi.fn(),
    markGood: vi.fn(),
    resetSession: vi.fn(),
  })),
}));

// Mock child components to avoid deep rendering issues
vi.mock("@/components/quiz/QuizLayout", () => ({
  QuizLayout: ({ children }: { children: React.ReactNode }): React.ReactElement => <div data-testid="quiz-layout">{children}</div>,
}));

vi.mock("@/components/quiz/QuestionDisplay", () => ({
  QuestionDisplay: (): React.ReactElement => <div data-testid="question-display" />,
}));

vi.mock("@/components/quiz/OptionsList", () => ({
  OptionsList: (): React.ReactElement => <div data-testid="options-list" />,
}));

vi.mock("@/components/quiz/ZenControls", () => ({
  SubmitButton: (): React.ReactElement => <button data-testid="submit-button">Submit</button>,
  ZenControls: (): React.ReactElement => <div data-testid="zen-controls" />,
}));

vi.mock("@/components/quiz/ExplanationPanel", () => ({
  ExplanationPanel: (): React.ReactElement => <div data-testid="explanation-panel" />,
}));

describe("ZenQuizContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useQuizSessionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      clearError: vi.fn(),
      error: null,
      questions: [],
      answers: new Map(),
      flaggedQuestions: new Set(),
    });
  });

  const mockQuiz = {
    id: "quiz-1",
    title: "Test Quiz",
    description: "Desc",
    topic: "Topic",
    questions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "user-1",
    is_public: false,
  } as unknown as Quiz;

  it("renders correctly after initialization", () => {
    render(<ZenQuizContainer quiz={mockQuiz} />);
    
    expect(screen.getByTestId("quiz-layout")).toBeDefined();
    expect(screen.getByTestId("question-display")).toBeDefined();
    expect(screen.getByTestId("options-list")).toBeDefined();
    expect(screen.getByTestId("submit-button")).toBeDefined();
  });
});
