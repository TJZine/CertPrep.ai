import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { useRouter } from "next/navigation";
import { useQuizSession } from "@/components/quiz/hooks/useQuizSession";
import { useQuizPersistence } from "@/components/quiz/hooks/useQuizPersistence";
import { useToast } from "@/components/ui/Toast";
import type { Quiz, Question } from "@/types/quiz";

// Mock the hooks
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/stores/quizSessionStore", () => ({
  useQuizSessionStore: vi.fn(),
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

vi.mock("@/components/quiz/hooks/useQuizPersistence", () => ({
  useQuizPersistence: vi.fn(),
}));

vi.mock("@/components/quiz/hooks/useQuizSession", () => ({
  useQuizSession: vi.fn(),
}));

// Mock child components to avoid deep rendering issues
vi.mock("@/components/quiz/QuizLayout", () => ({
  QuizLayout: ({
    children,
    onExit,
    title,
    timerKind,
  }: {
    children: React.ReactNode;
    onExit?: () => void;
    title: string;
    timerKind?: "elapsed" | "remaining";
  }): React.ReactElement => (
    <div data-testid="quiz-layout" data-timer-kind={timerKind ?? "elapsed"}>
      <h1>{title}</h1>
      <button data-testid="exit-button" onClick={onExit}>
        Exit
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/components/quiz/QuestionDisplay", () => ({
  QuestionDisplay: ({
    onToggleFlag,
  }: {
    onToggleFlag: () => void;
  }): React.ReactElement => (
    <div data-testid="question-display">
      <button data-testid="flag-button" onClick={onToggleFlag}>
        Flag
      </button>
    </div>
  ),
}));

vi.mock("@/components/quiz/OptionsList", () => ({
  OptionsList: ({
    onSelectOption,
  }: {
    onSelectOption: (id: string) => void;
  }): React.ReactElement => (
    <div data-testid="options-list">
      <button data-testid="select-option" onClick={() => onSelectOption("a")}>
        Select A
      </button>
    </div>
  ),
}));

vi.mock("@/components/quiz/ZenControls", () => ({
  SubmitButton: ({ onClick }: { onClick: () => void }): React.ReactElement => (
    <button data-testid="submit-button" onClick={onClick}>
      Submit
    </button>
  ),
  ZenControls: (): React.ReactElement => <div data-testid="zen-controls" />,
}));

vi.mock("@/components/quiz/ExplanationPanel", () => ({
  ExplanationPanel: (): React.ReactElement => (
    <div data-testid="explanation-panel" />
  ),
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
  const mockAddToast = vi.fn();
  const mockSubmitAnswer = vi.fn();
  const mockToggleFlag = vi.fn();
  const mockSelectAnswer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useToast).mockReturnValue({
      addToast: mockAddToast,
      toasts: [],
    } as unknown as ReturnType<typeof useToast>);

    vi.mocked(useQuizSessionStore).mockReturnValue({
      clearError: vi.fn(),
      error: null,
      questions: [],
      answers: new Map(),
      flaggedQuestions: new Set(),
    } as unknown as ReturnType<typeof useQuizSessionStore>);

    vi.mocked(useQuizPersistence).mockImplementation(
      () =>
        ({
          failure: null,
          submitQuiz: mockSubmitQuiz,
          retrySave: mockRetrySave,
          clearSessionStorage: vi.fn(),
          effectiveUserId: "user-1",
        }) as unknown as ReturnType<typeof useQuizPersistence>,
    );

    vi.mocked(useQuizSession).mockImplementation(
      () =>
        ({
          isInitializing: false,
          currentQuestion: { id: "q1", options: {} } as unknown as Question,
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
          selectAnswer: mockSelectAnswer,
          submitAnswer: mockSubmitAnswer,
          toggleExplanation: vi.fn(),
          toggleFlag: mockToggleFlag,
          markAgain: vi.fn(),
          markHard: vi.fn(),
          markGood: vi.fn(),
          resetSession: mockResetSession,
          draftDecision: null,
          draftSaveStatus: "saved",
          draftSaveMessage: "Saved on this device.",
          draftOwnerId: "writer-1",
          resumeDraft: vi.fn(),
          startOverDraft: vi.fn(),
          resumeDraftAsNewAttempt: vi.fn(),
          flushDraft: vi.fn().mockResolvedValue(true),
        }) as unknown as ReturnType<typeof useQuizSession>,
    );
  });

  it("renders correctly after initialization", () => {
    render(<ZenQuizContainer quiz={mockQuiz} />);

    expect(screen.getByTestId("quiz-layout")).toBeDefined();
    expect(screen.getByText("Test Quiz")).toBeDefined();
    expect(screen.getByTestId("question-display")).toBeDefined();
    expect(screen.getByTestId("options-list")).toBeDefined();
    expect(screen.getByTestId("submit-button")).toBeDefined();
    expect(screen.getByTestId("quiz-layout")).toHaveAttribute(
      "data-timer-kind",
      "elapsed",
    );
  });

  it("enables drafts only for ordinary standard Zen intent", () => {
    render(<ZenQuizContainer quiz={mockQuiz} sessionKind="standard_zen" />);
    expect(useQuizSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ draftEligible: true }),
    );
  });

  it.each([
    ["remixed Zen", { sessionKind: "remixed_zen" as const }],
    ["Smart Round", { isSmartRound: true }],
    ["Topic Study", { isTopicStudy: true }],
    ["SRS Review", { isSRSReview: true }],
    ["Interleaved Practice", { isInterleaved: true }],
    [
      "answer key mappings",
      { sessionKeyMappings: new Map([["q1", { a: "b", b: "a" }]]) },
    ],
  ])("never enables standard drafts for %s", (_label, props) => {
    render(<ZenQuizContainer quiz={mockQuiz} {...props} />);
    expect(useQuizSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ draftEligible: false }),
    );
  });

  it("offers explicit reconciliation choices for a newer completed result", () => {
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: false,
      currentQuestion: null,
      progress: { current: 0, total: 2 },
      isComplete: false,
      seconds: 30,
      pauseTimer: mockPauseTimer,
      resetSession: mockResetSession,
      draftDecision: {
        kind: "result-conflict",
        assessment: {
          compatibility: "result-conflict",
          draft: { revision: 2 },
          latest_result_at: 2_000,
        },
      },
      draftSaveStatus: "saved",
      draftSaveMessage: "Saved on this device.",
      draftOwnerId: null,
      startOverDraft: vi.fn(),
      resumeDraftAsNewAttempt: vi.fn(),
      flushDraft: vi.fn().mockResolvedValue(true),
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} />);

    expect(
      screen.getByRole("dialog", { name: "Quiz completed elsewhere" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start New Attempt" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resume as New Attempt" }),
    ).toBeInTheDocument();
  });

  it("renders loading state when initializing", () => {
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: true,
      progress: { current: 0, total: 10 },
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} />);
    expect(screen.getByText("Initializing quiz session...")).toBeDefined();
  });

  it("handles interactions correctly", () => {
    render(<ZenQuizContainer quiz={mockQuiz} />);

    fireEvent.click(screen.getByTestId("flag-button"));
    expect(mockToggleFlag).toHaveBeenCalledWith("q1");

    fireEvent.click(screen.getByTestId("select-option"));
    expect(mockSelectAnswer).toHaveBeenCalledWith("a");

    fireEvent.click(screen.getByTestId("submit-button"));
    expect(mockSubmitAnswer).toHaveBeenCalled();
  });

  it("renders SRS controls when hasSubmitted is true", () => {
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: false,
      currentQuestion: { id: "q1", options: {} } as unknown as Question,
      currentIndex: 0,
      progress: { current: 1, total: 10 },
      hasSubmitted: true,
      isCurrentAnswerCorrect: true,
      isComplete: false,
      isResolving: false,
      currentCorrectAnswer: "a",
      selectedAnswer: "a",
      showExplanation: false,
      pauseTimer: mockPauseTimer,
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} isSRSReview={true} />);

    expect(screen.getByTestId("zen-controls")).toBeDefined();
    expect(mockAddToast).toHaveBeenCalledWith("success", expect.any(String));
  });

  it("surfaces a draft-flush completion failure and retries the full preflight", async () => {
    const flushDraft = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: false,
      currentQuestion: null,
      currentIndex: 1,
      progress: { current: 2, total: 2 },
      selectedAnswer: null,
      hasSubmitted: false,
      showExplanation: false,
      isComplete: true,
      formattedTime: "00:10",
      seconds: 10,
      pauseTimer: mockPauseTimer,
      isResolving: false,
      isCurrentAnswerCorrect: false,
      isLastQuestion: true,
      resetSession: mockResetSession,
      draftDecision: null,
      draftSaveStatus: "error",
      draftSaveMessage: "The latest progress is not saved.",
      draftOwnerId: "writer-1",
      flushDraft,
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} />);

    await waitFor(() => expect(flushDraft).toHaveBeenCalledTimes(1));
    expect(mockSubmitQuiz).not.toHaveBeenCalled();
    expect(
      screen.getByText(/couldn't save your latest progress before completing/i),
    ).toBeInTheDocument();
    expect(mockAddToast).toHaveBeenCalledWith(
      "error",
      expect.stringMatching(/retry completion/i),
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry completion" }));

    await waitFor(() => expect(flushDraft).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockSubmitQuiz).toHaveBeenCalledWith(10));
    expect(mockPauseTimer).toHaveBeenCalledTimes(2);
  });

  it("completes a conflicted tab without flushing or deleting the newer draft", async () => {
    const flushDraft = vi.fn().mockResolvedValue(false);
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: false,
      currentQuestion: null,
      currentIndex: 1,
      progress: { current: 2, total: 2 },
      selectedAnswer: null,
      hasSubmitted: false,
      showExplanation: false,
      isComplete: true,
      formattedTime: "00:10",
      seconds: 10,
      pauseTimer: mockPauseTimer,
      isResolving: false,
      isCurrentAnswerCorrect: false,
      isLastQuestion: true,
      resetSession: mockResetSession,
      draftDecision: null,
      draftSaveStatus: "conflict",
      draftSaveMessage: "This draft was updated in another tab.",
      draftOwnerId: null,
      flushDraft,
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} />);

    await waitFor(() => expect(mockSubmitQuiz).toHaveBeenCalledWith(10));
    expect(flushDraft).not.toHaveBeenCalled();
  });

  it("displays save error UI and handles retry", async () => {
    vi.mocked(useQuizPersistence).mockImplementation(
      () =>
        ({
          failure: {
            kind: "transient",
            message: "We couldn't save your results.",
            canRetry: true,
          },
          submitQuiz: mockSubmitQuiz,
          retrySave: mockRetrySave,
          clearSessionStorage: vi.fn(),
          effectiveUserId: "user-1",
        }) as unknown as ReturnType<typeof useQuizPersistence>,
    );

    vi.mocked(useQuizSession).mockImplementation(
      () =>
        ({
          isInitializing: false,
          currentQuestion: null,
          currentIndex: 0,
          progress: { current: 1, total: 10 },
          selectedAnswer: null,
          hasSubmitted: false,
          showExplanation: false,
          isComplete: true,
          formattedTime: "00:10",
          seconds: 10,
          pauseTimer: mockPauseTimer,
          isResolving: false,
          isCurrentAnswerCorrect: true,
          isLastQuestion: false,
          resetSession: mockResetSession,
          draftDecision: null,
          draftSaveStatus: "saved",
          draftSaveMessage: "Saved on this device.",
          draftOwnerId: "writer-1",
          flushDraft: vi.fn().mockResolvedValue(true),
        }) as unknown as ReturnType<typeof useQuizSession>,
    );

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

  it("offers dashboard recovery instead of retrying a permanent save failure", async () => {
    const clearSessionStorage = vi.fn();
    const flushDraft = vi.fn().mockResolvedValue(false);
    vi.mocked(useQuizPersistence).mockReturnValue({
      failure: {
        kind: "permanent",
        code: "QUIZ_CHANGED",
        message:
          "This quiz changed while you were studying. Return to the dashboard and start a new attempt.",
        canRetry: false,
      },
      submitQuiz: mockSubmitQuiz,
      retrySave: mockRetrySave,
      clearSessionStorage,
      effectiveUserId: "user-1",
    });
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: false,
      currentQuestion: null,
      currentIndex: 1,
      progress: { current: 2, total: 2 },
      isComplete: false,
      seconds: 10,
      pauseTimer: mockPauseTimer,
      resetSession: mockResetSession,
      draftDecision: null,
      draftSaveStatus: "saved",
      draftSaveMessage: "Saved on this device.",
      draftOwnerId: "writer-1",
      flushDraft,
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} />);

    expect(
      screen.getByText(/quiz changed while you were studying/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry save" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Dashboard" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    expect(flushDraft).not.toHaveBeenCalled();
    expect(mockResetSession).toHaveBeenCalledOnce();
    expect(clearSessionStorage).toHaveBeenCalledOnce();
  });

  it("handles exit correctly for standard mode", async () => {
    render(<ZenQuizContainer quiz={mockQuiz} />);
    fireEvent.click(screen.getByTestId("exit-button"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });

  it("lets a stale tab exit without overwriting the newer draft", async () => {
    const flushDraft = vi.fn().mockResolvedValue(false);
    vi.mocked(useQuizSession).mockReturnValue({
      isInitializing: false,
      currentQuestion: { id: "q1", options: {} } as unknown as Question,
      currentIndex: 0,
      progress: { current: 1, total: 10 },
      selectedAnswer: null,
      hasSubmitted: false,
      showExplanation: false,
      isComplete: false,
      formattedTime: "00:10",
      seconds: 10,
      pauseTimer: mockPauseTimer,
      isResolving: false,
      isCurrentAnswerCorrect: false,
      isLastQuestion: false,
      resetSession: mockResetSession,
      draftDecision: null,
      draftSaveStatus: "conflict",
      draftSaveMessage: "This draft was updated in another tab.",
      draftOwnerId: "writer-old",
      flushDraft,
    } as unknown as ReturnType<typeof useQuizSession>);

    render(<ZenQuizContainer quiz={mockQuiz} />);
    fireEvent.click(screen.getByTestId("exit-button"));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    expect(flushDraft).not.toHaveBeenCalled();
    expect(mockResetSession).toHaveBeenCalled();
  });

  it("handles exit correctly for SRS review", () => {
    render(<ZenQuizContainer quiz={mockQuiz} isSRSReview={true} />);
    fireEvent.click(screen.getByTestId("exit-button"));
    expect(mockPush).toHaveBeenCalledWith("/study-due");
  });

  it("handles exit correctly for topic study", () => {
    render(<ZenQuizContainer quiz={mockQuiz} isTopicStudy={true} />);
    fireEvent.click(screen.getByTestId("exit-button"));
    expect(mockPush).toHaveBeenCalledWith("/analytics");
  });

  it("handles exit correctly for interleaved mode", () => {
    render(<ZenQuizContainer quiz={mockQuiz} isInterleaved={true} />);
    fireEvent.click(screen.getByTestId("exit-button"));
    expect(mockPush).toHaveBeenCalledWith("/interleaved");
  });
});
