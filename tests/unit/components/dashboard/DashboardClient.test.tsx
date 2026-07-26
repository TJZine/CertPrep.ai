import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardClient from "@/components/dashboard/DashboardClient";

// Define mocks outside to ensure hoisting compatibility
const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useEffectiveUserId: vi.fn(),
  useInitializeDatabase: vi.fn(),
  useQuizzes: vi.fn(),
  useDashboardStats: vi.fn(),
  useToast: vi.fn(),
  getDueCountsByBox: vi.fn(),
  useSearchParams: vi.fn(),
  useZenDraftStatuses: vi.fn(),
}));

// Mock Hooks
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: mocks.useEffectiveUserId,
}));

vi.mock("@/hooks/useDatabase", () => ({
  useInitializeDatabase: mocks.useInitializeDatabase,
  useQuizzes: mocks.useQuizzes,
  useZenDraftStatuses: mocks.useZenDraftStatuses,
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: mocks.useDashboardStats,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: mocks.useToast,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mocks.useSearchParams,
}));

// Note: deleteQuiz mock removed - add to mocks object when delete flow tests are added

vi.mock("@/db/srs", () => ({
  getDueCountsByBox: mocks.getDueCountsByBox,
}));

vi.mock("@/lib/prefetch", () => ({
  prefetchOnIdle: vi.fn().mockReturnValue(() => {}),
}));

// Mock components
vi.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: ({
    onImportClick,
  }: {
    onImportClick: () => void;
  }): React.JSX.Element => (
    <div data-testid="dashboard-header">
      <button onClick={onImportClick}>Import Quiz</button>
    </div>
  ),
}));

vi.mock("@/components/dashboard/StatsBar", () => ({
  StatsBar: (): React.JSX.Element => <div data-testid="stats-bar" />,
}));
vi.mock("@/components/dashboard/QuizGrid", () => ({
  QuizGrid: ({
    quizzes,
    onStartQuiz,
    areZenDraftStatusesAvailable,
    unknownZenDraftQuizIds,
  }: {
    quizzes: Array<{ id: string; title: string }>;
    onStartQuiz: (quiz: { id: string; title: string }) => void;
    areZenDraftStatusesAvailable: boolean;
    unknownZenDraftQuizIds: ReadonlySet<string>;
  }): React.JSX.Element => (
    <div data-testid="quiz-grid">
      {quizzes.map((quiz) => {
        const disabled =
          !areZenDraftStatusesAvailable ||
          unknownZenDraftQuizIds.has(quiz.id);
        return (
          <button
            key={quiz.id}
            disabled={disabled}
            onClick={() => onStartQuiz(quiz)}
          >
            Open {quiz.title}
          </button>
        );
      })}
    </div>
  ),
}));
vi.mock("@/components/dashboard/QuizSortControls", () => ({
  QuizSortControls: (): React.JSX.Element => (
    <div data-testid="quiz-sort-controls" />
  ),
}));
vi.mock("@/components/srs/DueQuestionsCard", () => ({
  DueQuestionsCard: (): React.JSX.Element => (
    <div data-testid="due-questions-card" />
  ),
}));
vi.mock("@/components/dashboard/InterleavedPracticeCard", () => ({
  InterleavedPracticeCard: (): React.JSX.Element => (
    <div data-testid="interleaved-card" />
  ),
}));

vi.mock("@/components/dashboard/ImportModal", () => ({
  ImportModal: ({ isOpen }: { isOpen: boolean }): React.JSX.Element | null =>
    isOpen ? <div data-testid="import-modal">Import Modal Content</div> : null,
}));

vi.mock("@/components/dashboard/ModeSelectModal", () => ({
  ModeSelectModal: ({
    isOpen,
  }: {
    isOpen: boolean;
  }): React.JSX.Element | null =>
    isOpen ? <div data-testid="mode-select-modal" /> : null,
}));

describe("DashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default stable mock returns
    mocks.useAuth.mockReturnValue({
      user: { id: "test-user" },
      isLoading: false,
    });
    mocks.useEffectiveUserId.mockReturnValue("test-user");
    mocks.useInitializeDatabase.mockReturnValue({
      isInitialized: true,
      error: null,
    });
    mocks.useQuizzes.mockReturnValue({
      quizzes: [],
      isLoading: false,
      error: null,
    });
    mocks.useZenDraftStatuses.mockReturnValue({
      statuses: new Map(),
      unknownQuizIds: new Set(),
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    mocks.useDashboardStats.mockReturnValue({
      quizStats: new Map(),
      overallStats: {
        totalQuizzes: 0,
        totalAttempts: 0,
        averageScore: 0,
        totalStudyTime: 0,
      },
      isLoading: false,
    });
    mocks.useToast.mockReturnValue({ addToast: vi.fn() });
    mocks.getDueCountsByBox.mockResolvedValue({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    mocks.useSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("renders dashboard header after initialization", async () => {
    render(<DashboardClient />);

    // Check if loading state resolves
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    });

    // Verify hooks were called with correct arguments
    expect(mocks.useEffectiveUserId).toHaveBeenCalledWith("test-user");
    expect(mocks.useQuizzes).toHaveBeenCalledWith("test-user");
    expect(mocks.useDashboardStats).toHaveBeenCalledWith("test-user");
  });

  it("lazy loads and opens ImportModal when requested", async () => {
    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    });

    const importBtn = screen.getByText("Import Quiz");
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByTestId("import-modal")).toBeInTheDocument();
    });
  });

  it("opens ImportModal automatically when the import query param is present", async () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("import=1"));

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByTestId("import-modal")).toBeInTheDocument();
    });
  });

  it("opens the mode selector when a quiz start action is requested", async () => {
    const quiz = {
      id: "quiz-1",
      title: "Finished quiz",
      tags: [],
      questions: [],
      created_at: 1,
    };
    mocks.useQuizzes.mockReturnValue({
      quizzes: [quiz],
      isLoading: false,
      error: null,
    });

    render(<DashboardClient />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Open Finished quiz" }),
    );

    expect(await screen.findByTestId("mode-select-modal")).toBeInTheDocument();
  });

  it("disables quiz launch and offers retry when saved status loading fails", async () => {
    const retry = vi.fn();
    const quiz = {
      id: "quiz-1",
      title: "Saved quiz",
      tags: [],
      questions: [],
      created_at: 1,
    };
    mocks.useQuizzes.mockReturnValue({
      quizzes: [quiz],
      isLoading: false,
      error: null,
    });
    mocks.useZenDraftStatuses.mockReturnValue({
      statuses: new Map(),
      unknownQuizIds: new Set(),
      isLoading: false,
      error: new Error("IndexedDB unavailable"),
      retry,
    });

    render(<DashboardClient />);

    expect(
      await screen.findByText(/saved quiz status is temporarily unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Saved quiz" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry saved quiz status" }),
    );
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("mode-select-modal")).not.toBeInTheDocument();
  });

  it("disables only the quiz with an unknown draft assessment", async () => {
    const quizzes = [
      {
        id: "healthy",
        title: "Healthy quiz",
        tags: [],
        questions: [],
        created_at: 1,
      },
      {
        id: "unknown",
        title: "Unknown quiz",
        tags: [],
        questions: [],
        created_at: 2,
      },
    ];
    mocks.useQuizzes.mockReturnValue({
      quizzes,
      isLoading: false,
      error: null,
    });
    mocks.useZenDraftStatuses.mockReturnValue({
      statuses: new Map(),
      unknownQuizIds: new Set(["unknown"]),
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });

    render(<DashboardClient />);

    expect(
      await screen.findByText(/some saved quiz statuses could not be verified/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Unknown quiz" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Open Healthy quiz" }),
    ).toBeEnabled();
  });
});
