/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { useRouter } from "next/navigation";
import { useQuizSession } from "@/components/quiz/hooks/useQuizSession";
import { useQuizPersistence } from "@/components/quiz/hooks/useQuizPersistence";
import type { Quiz } from "@/types/quiz";

// Mock the hooks
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
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
  useQuizPersistence: vi.fn(),
}));

vi.mock("@/components/quiz/hooks/useQuizSession", () => ({
  useQuizSession: vi.fn(),
}));

// Mock child components to avoid deep rendering issues
vi.mock("@/components/quiz/QuizLayout", () => ({
  QuizLayout: ({ children, onExit }: { children: React.ReactNode; onExit?: () => void }): React.ReactElement => (
    <div data-testid="quiz-layout">
      <button data-testid="exit-button" onClick={onExit}>Exit</button>
      {children}
    </div>
  ),
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
  const mockQuiz = {
    id: "quiz-1",
    title: "Test Quiz",
    questions: [],
  } as unknown as Quiz;

  const mockPush = vi.fn();
  const mockResetSession = vi.fn();
  const mockPauseTimer = vi.fn();
  const mockSubmitQuiz = vi.fn().mockResolvedValue(undefined);
  const mockRetrySave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    
    vi.mocked(useQuizSessionStore).mockReturnValue({
      clearError: vi.fn(),
      error: null,
      questions: [],
      answers: new Map(),
      flaggedQuestions: new Set(),
    } as any);

    vi.mocked(useQuizPersistence).mockImplementation(() => ({
      saveError: false,
      submitQuiz: mockSubmitQuiz,
      retrySave: mockRetrySave,
      clearSessionStorage: vi.fn(),
      effectiveUserId: "user-1",
    }));

    vi.mocked(useQuizSession).mockImplementation(() => ({
      isInitializing: false,
      currentQuestion: { id: "q1", options: {} },
      currentIndex: 0,
      progress: { current: 1, total: 10 },
      selectedAnswer: null,
      hasSubmitted: false,
      showExplanation: false,
      isComplete: false,
      formattedTime: "00:00",
      seconds: 0,
      pauseTimer: mockPauseTimer,
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
      resetSession: mockResetSession,
    } as any));
  });

  it("renders correctly after initialization", () => {
    render(<ZenQuizContainer quiz={mockQuiz} />);
    
    expect(screen.getByTestId("quiz-layout")).toBeDefined();
    expect(screen.getByTestId("question-display")).toBeDefined();
    expect(screen.getByTestId("options-list")).toBeDefined();
    expect(screen.getByTestId("submit-button")).toBeDefined();
  });

  it("renders SRS controls when isSRSReview is true", () => {
    vi.mocked(useQuizSession).mockImplementation(() => ({
      isInitializing: false,
      currentQuestion: { id: "q1", options: {} },
      currentIndex: 0,
      progress: { current: 1, total: 10 },
      selectedAnswer: null,
      hasSubmitted: true,
      showExplanation: false,
      isComplete: false,
      formattedTime: "00:00",
      seconds: 0,
      pauseTimer: mockPauseTimer,
      isResolving: false,
      isCurrentAnswerCorrect: true,
      isLastQuestion: false,
      isSRSReview: true,
      resetSession: mockResetSession,
    } as any));

    render(<ZenQuizContainer quiz={mockQuiz} isSRSReview={true} />);
    
    expect(screen.getByTestId("zen-controls")).toBeDefined();
  });

  it("displays save error UI and handles retry", async () => {
    vi.mocked(useQuizPersistence).mockImplementation(() => ({
      saveError: true,
      submitQuiz: mockSubmitQuiz,
      retrySave: mockRetrySave,
      clearSessionStorage: vi.fn(),
      effectiveUserId: "user-1",
    }));

    vi.mocked(useQuizSession).mockImplementation(() => ({
      isInitializing: false,
      currentQuestion: { id: "q1", options: {} },
      currentIndex: 0,
      progress: { current: 1, total: 10 },
      selectedAnswer: "a",
      hasSubmitted: true,
      showExplanation: false,
      isComplete: true,
      formattedTime: "00:10",
      seconds: 10,
      pauseTimer: mockPauseTimer,
      isResolving: false,
      isCurrentAnswerCorrect: true,
      isLastQuestion: false,
      resetSession: mockResetSession,
    } as any));

    render(<ZenQuizContainer quiz={mockQuiz} />);
    
    await waitFor(() => {
      expect(mockPauseTimer).toHaveBeenCalled();
    });
    
    expect(screen.getByText(/We couldn't save your results/)).toBeDefined();
    fireEvent.click(screen.getByText("Retry save"));
    
    await waitFor(() => {
      expect(mockRetrySave).toHaveBeenCalledWith(10);
    });
  });

  it("handles exit correctly", () => {
    render(<ZenQuizContainer quiz={mockQuiz} />);
    
    fireEvent.click(screen.getByTestId("exit-button"));
    
    expect(mockResetSession).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("handles SRS exit correctly", () => {
    render(<ZenQuizContainer quiz={mockQuiz} isSRSReview={true} />);
    
    fireEvent.click(screen.getByTestId("exit-button"));
    
    expect(mockPush).toHaveBeenCalledWith("/study-due");
  });
});
