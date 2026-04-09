/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProctorQuizContainer } from "@/components/quiz/ProctorQuizContainer";
import {
  useQuizSessionStore,
  useCurrentQuestion,
  useProctorStatus,
  useQuestionStatuses,
} from "@/stores/quizSessionStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useTimer } from "@/hooks/useTimer";
import { useExamSubmission } from "@/hooks/useExamSubmission";
import { remixQuiz } from "@/lib/quiz/quizRemix";
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
  useCurrentQuestion: vi.fn(),
  useProctorStatus: vi.fn(),
  useQuestionStatuses: vi.fn(),
}));

vi.mock("@/hooks/useTimer", () => ({
  useTimer: vi.fn(),
}));

vi.mock("@/hooks/useKeyboardNav", () => ({
  useKeyboardNav: vi.fn(),
}));

vi.mock("@/hooks/useBeforeUnload", () => ({
  useBeforeUnload: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user-1" } })),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: vi.fn(() => "user-1"),
}));

vi.mock("@/hooks/useExamSubmission", () => ({
  useExamSubmission: vi.fn(),
}));

vi.mock("@/lib/quiz/quizRemix", () => ({
  remixQuiz: vi.fn(),
}));

// Mock child components
vi.mock("@/components/quiz/QuizLayout", () => ({
  QuizLayout: ({
    children,
    onExit,
  }: {
    children: React.ReactNode;
    onExit?: () => void;
  }): React.ReactElement => (
    <div data-testid="quiz-layout">
      <button data-testid="exit-button" onClick={onExit}>
        Exit
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/components/quiz/QuestionDisplay", () => ({
  QuestionDisplay: (): React.ReactElement => (
    <div data-testid="question-display" />
  ),
}));

vi.mock("@/components/quiz/ProctorOptionsList", () => ({
  ProctorOptionsList: (): React.ReactElement => (
    <div data-testid="options-list" />
  ),
}));

vi.mock("@/components/quiz/ProctorControls", () => ({
  ProctorControls: ({
    onSubmitExam,
  }: {
    onSubmitExam: () => void;
  }): React.ReactElement => (
    <div data-testid="proctor-controls">
      <button data-testid="submit-exam-button" onClick={onSubmitExam}>
        Submit Exam
      </button>
    </div>
  ),
}));

vi.mock("@/components/quiz/QuestionNavGrid", () => ({
  QuestionNavGrid: (): React.ReactElement => <div data-testid="nav-grid" />,
  QuestionNavStrip: (): React.ReactElement => <div data-testid="nav-strip" />,
}));

vi.mock("@/components/quiz/SubmitExamModal", () => ({
  SubmitExamModal: ({
    isOpen,
  }: {
    isOpen: boolean;
  }): React.ReactElement | null =>
    isOpen ? <div data-testid="submit-modal" /> : null,
  TimeUpModal: ({ isOpen }: { isOpen: boolean }): React.ReactElement | null =>
    isOpen ? <div data-testid="time-up-modal" /> : null,
}));

describe("ProctorQuizContainer", () => {
  const mockQuiz = {
    id: "quiz-1",
    title: "Proctor Exam",
    questions: [{ id: "q1", question: "Q1", options: { a: "A" } }],
  } as unknown as Quiz;

  const mockInitializeProctorSession = vi.fn();
  const mockResetSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuizSessionStore).mockReturnValue({
      initializeProctorSession: mockInitializeProctorSession,
      resetSession: mockResetSession,
      updateTimeRemaining: vi.fn(),
      clearError: vi.fn(),
      currentIndex: 0,
      answers: new Map(),
      flaggedQuestions: new Set(),
      isComplete: false,
      error: null,
    } as any);

    vi.mocked(useCurrentQuestion).mockReturnValue(mockQuiz.questions[0] as any);
    vi.mocked(useProctorStatus).mockReturnValue({
      answeredCount: 0,
      totalQuestions: 1,
      unansweredCount: 1,
      flaggedCount: 0,
      isTimeWarning: false,
    } as any);
    vi.mocked(useQuestionStatuses).mockReturnValue([
      { id: "q1", status: "unanswered" },
    ] as any);

    vi.mocked(useTimer).mockReturnValue({
      seconds: 3600,
      formattedTime: "60:00",
      start: vi.fn(),
      pause: vi.fn(),
    } as any);

    vi.mocked(useExamSubmission).mockReturnValue({
      isSubmitting: false,
      showSubmitModal: false,
      setShowSubmitModal: vi.fn(),
      showTimeUpModal: false,
      handleSubmitExam: vi.fn(),
      handleAutoSubmit: vi.fn(),
      handleTimeUpConfirm: vi.fn(),
    } as any);

    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any);
    vi.mocked(useSearchParams).mockReturnValue({ get: vi.fn() } as any);
  });

  it("calls initializeProctorSession on mount", async () => {
    render(<ProctorQuizContainer quiz={mockQuiz} />);

    await waitFor(() => {
      expect(mockInitializeProctorSession).toHaveBeenCalledWith(
        mockQuiz.id,
        mockQuiz.questions,
        expect.any(Number),
      );
    });
  });

  it("handles remix mode correctly", async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key) => (key === "remix" ? "true" : null)),
    } as any);

    const remixedQuestions = [{ id: "rq1", question: "Remixed Q1" }];
    vi.mocked(remixQuiz).mockResolvedValue({
      quiz: { questions: remixedQuestions },
      keyMappings: {},
    } as any);

    render(<ProctorQuizContainer quiz={mockQuiz} />);

    await waitFor(() => {
      expect(remixQuiz).toHaveBeenCalled();
      expect(mockInitializeProctorSession).toHaveBeenCalledWith(
        mockQuiz.id,
        remixedQuestions,
        expect.any(Number),
        expect.any(Object),
      );
    });
  });

  it("shows submit modal when triggered", async () => {
    vi.mocked(useExamSubmission).mockReturnValue({
      ...vi.mocked(useExamSubmission)({} as any),
      showSubmitModal: true,
    } as any);

    render(<ProctorQuizContainer quiz={mockQuiz} />);

    expect(screen.getByTestId("submit-modal")).toBeDefined();
  });

  it("handles exit and resets session", async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as any);

    render(<ProctorQuizContainer quiz={mockQuiz} />);

    const exitBtn = screen.getByTestId("exit-button");
    fireEvent.click(exitBtn);

    expect(mockResetSession).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });
});
