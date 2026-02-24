import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Quiz } from "@/types/quiz";

const mocks = vi.hoisted(() => ({
    useAuth: vi.fn(),
    useEffectiveUserId: vi.fn(),
    useInitializeDatabase: vi.fn(),
    useQuizzes: vi.fn(),
    useDashboardStats: vi.fn(),
    getDueCountsByBox: vi.fn(),
    useToast: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
    useAuth: mocks.useAuth,
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
    useEffectiveUserId: mocks.useEffectiveUserId,
}));

vi.mock("@/hooks/useDatabase", () => ({
    useInitializeDatabase: mocks.useInitializeDatabase,
    useQuizzes: mocks.useQuizzes,
}));

vi.mock("@/hooks/useDashboardStats", () => ({
    useDashboardStats: mocks.useDashboardStats,
}));

vi.mock("@/db/srs", () => ({
    getDueCountsByBox: mocks.getDueCountsByBox,
}));

vi.mock("@/components/ui/Toast", () => ({
    useToast: mocks.useToast,
}));

vi.mock("@/lib/prefetch", () => ({
    prefetchOnIdle: vi.fn().mockReturnValue(() => { }),
}));

vi.mock("@/components/dashboard/DashboardHeader", () => ({
    DashboardHeader: (): React.JSX.Element => <div data-testid="dashboard-header" />,
}));

vi.mock("@/components/dashboard/StatsBar", () => ({
    StatsBar: (): React.JSX.Element => <div data-testid="stats-bar" />,
}));

vi.mock("@/components/dashboard/QuizGrid", () => ({
    QuizGrid: (): React.JSX.Element => <div data-testid="quiz-grid" />,
}));

vi.mock("@/components/dashboard/QuizSortControls", () => ({
    QuizSortControls: ({
        searchTerm,
        onSearchChange,
    }: {
        searchTerm: string;
        onSearchChange: (value: string) => void;
    }): React.JSX.Element => (
        <label>
            Search quizzes
            <input
                aria-label="Search quizzes"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
            />
        </label>
    ),
}));

vi.mock("@/components/srs/DueQuestionsCard", () => ({
    DueQuestionsCard: (): React.JSX.Element => <div data-testid="due-questions-card" />,
}));

vi.mock("@/components/dashboard/InterleavedPracticeCard", () => ({
    InterleavedPracticeCard: (): React.JSX.Element => <div data-testid="interleaved-card" />,
}));

const makeQuiz = (id: string, title: string): Quiz => ({
    id,
    user_id: "test-user",
    title,
    description: "",
    created_at: 1700000000000,
    updated_at: 1700000000000,
    questions: [],
    tags: [],
    version: 1,
});

describe("DashboardClient empty states", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.useAuth.mockReturnValue({ user: { id: "test-user" }, isLoading: false });
        mocks.useEffectiveUserId.mockReturnValue("test-user");
        mocks.useInitializeDatabase.mockReturnValue({ isInitialized: true, error: null });
        mocks.useQuizzes.mockReturnValue({ quizzes: [], isLoading: false, error: null });
        mocks.useDashboardStats.mockReturnValue({
            quizStats: new Map(),
            overallStats: null,
            isLoading: false,
        });
        mocks.getDueCountsByBox.mockResolvedValue({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        mocks.useToast.mockReturnValue({ addToast: vi.fn() });
    });

    it("renders styled stats empty state when overall stats are absent", async () => {
        render(<DashboardClient />);

        await waitFor(() => {
            expect(screen.getByTestId("stats-empty-state")).toBeInTheDocument();
            expect(screen.getByText("Performance insights appear here")).toBeInTheDocument();
        });
    });

    it("renders styled search empty state when search filters out all quizzes", async () => {
        mocks.useQuizzes.mockReturnValue({
            quizzes: [makeQuiz("q1", "AWS Foundations")],
            isLoading: false,
            error: null,
        });

        mocks.useDashboardStats.mockReturnValue({
            quizStats: new Map(),
            overallStats: {
                totalQuizzes: 1,
                totalAttempts: 0,
                averageScore: 0,
                totalStudyTime: 0,
            },
            isLoading: false,
        });

        render(<DashboardClient />);

        const input = await screen.findByRole("textbox", { name: /search quizzes/i });
        fireEvent.change(input, { target: { value: "GCP" } });

        await waitFor(() => {
            expect(screen.getByTestId("search-empty-state")).toBeInTheDocument();
            expect(screen.getByText("No quizzes match this filter")).toBeInTheDocument();
        });
    });
});
