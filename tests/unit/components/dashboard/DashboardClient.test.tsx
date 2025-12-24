import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { useQuizzes, useInitializeDatabase } from "@/hooks/useDatabase";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { getDueCountsByBox } from "@/db/srs";
import { deleteQuiz } from "@/db/quizzes";

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// 1. Mock Hooks
vi.mock("@/hooks/useDatabase", () => ({
    useQuizzes: vi.fn(),
    useInitializeDatabase: vi.fn(),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
    useDashboardStats: vi.fn(),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
    useEffectiveUserId: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
    useAuth: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
    useToast: vi.fn(),
}));

// 2. Mock DB/Logic
vi.mock("@/db/quizzes", () => ({
    deleteQuiz: vi.fn(),
}));

vi.mock("@/db/srs", () => ({
    getDueCountsByBox: vi.fn(),
}));

// 3. Mock Next.js Dynamic Imports and Components
vi.mock("next/dynamic", () => ({
    default: (): React.ComponentType<{ isOpen: boolean; onClose: () => void; onConfirm?: () => void;[key: string]: unknown }> => {
        const MockModal = (props: { isOpen: boolean; onClose: () => void; onConfirm?: () => void;[key: string]: unknown }): React.ReactNode => {
            if (!props.isOpen) return null;
            return (
                <div data-testid="mock-modal">
                    {JSON.stringify(props)}
                    <button onClick={props.onClose}>Close</button>
                    {props.onConfirm && <button onClick={props.onConfirm}>Confirm</button>}
                </div>
            );
        };
        return MockModal;
    },
}));

vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
    DashboardSkeleton: (): React.ReactNode => <div data-testid="dashboard-skeleton">Last Loading...</div>,
}));

interface DashboardHeaderProps {
    onImportClick: () => void;
    quizCount: number;
}

vi.mock("@/components/dashboard/DashboardHeader", () => ({
    DashboardHeader: ({ onImportClick, quizCount }: DashboardHeaderProps): React.ReactNode => (
        <div data-testid="dashboard-header">
            <button onClick={onImportClick}>Import Quiz</button>
            <span>Count: {quizCount}</span>
        </div>
    ),
}));

vi.mock("@/components/dashboard/StatsBar", () => ({
    StatsBar: (): React.ReactNode => <div data-testid="stats-bar">Stats Bar</div>,
}));

interface MockQuiz {
    id: string;
    title: string;
}

interface QuizGridProps {
    quizzes: MockQuiz[];
    onStartQuiz: (q: MockQuiz) => void;
    onDeleteQuiz: (q: MockQuiz) => void;
}

vi.mock("@/components/dashboard/QuizGrid", () => ({
    QuizGrid: ({ quizzes, onStartQuiz, onDeleteQuiz }: QuizGridProps): React.ReactNode => (
        <div data-testid="quiz-grid">
            {quizzes.map((q) => (
                <div key={q.id} data-testid={`quiz-item-${q.id}`}>
                    {q.title}
                    <button onClick={() => onStartQuiz(q)}>Start</button>
                    <button onClick={() => onDeleteQuiz(q)}>Delete</button>
                </div>
            ))}
        </div>
    ),
}));

interface QuizSortControlsProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    categoryFilter: string;
    onCategoryChange: (val: string) => void;
    sortBy: string;
    onSortChange: (val: string) => void;
    categories: string[];
}

vi.mock("@/components/dashboard/QuizSortControls", () => ({
    QuizSortControls: ({ searchTerm, onSearchChange, categoryFilter, onCategoryChange, sortBy, onSortChange, categories }: QuizSortControlsProps): React.ReactNode => (
        <div data-testid="quiz-sort-controls">
            <input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
            />
            <select
                data-testid="category-select"
                value={categoryFilter}
                onChange={(e) => onCategoryChange(e.target.value)}
            >
                {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
                data-testid="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
            >
                <option value="recent">Recent</option>
                <option value="performance">Performance</option>
                <option value="title">Title</option>
            </select>
        </div>
    ),
}));

vi.mock("@/components/srs/DueQuestionsCard", () => ({
    DueQuestionsCard: (): React.ReactNode => <div data-testid="due-questions-card">Due Questions</div>,
}));

vi.mock("@/components/dashboard/InterleavedPracticeCard", () => ({
    InterleavedPracticeCard: (): React.ReactNode => <div data-testid="interleaved-practice-card">Interleaved Practice</div>,
}));

describe("DashboardClient", () => {
    const mockUser = { id: "user-123" };

    beforeEach((): void => {
        vi.clearAllMocks();

        // Default successful setup
        (useAuth as Mock).mockReturnValue({ user: mockUser, isLoading: false });
        (useEffectiveUserId as Mock).mockReturnValue(mockUser.id);
        (useInitializeDatabase as Mock).mockReturnValue({ isInitialized: true, error: null });
        (useQuizzes as Mock).mockReturnValue({ quizzes: [], isLoading: false, error: null });
        (useDashboardStats as Mock).mockReturnValue({
            quizStats: new Map(),
            overallStats: { totalQuizzes: 0, totalAttempts: 0, averageScore: 0, totalStudyTime: 0 },
            isLoading: false
        });
        (useToast as Mock).mockReturnValue({ addToast: vi.fn() });
        (getDueCountsByBox as Mock).mockResolvedValue({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    describe("Initialization & Loading States", () => {
        it("renders skeleton when auth is loading", (): void => {
            (useAuth as Mock).mockReturnValue({ user: null, isLoading: true });
            render(<DashboardClient />);
            expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
        });

        it("renders skeleton when database is not initialized", (): void => {
            (useInitializeDatabase as Mock).mockReturnValue({ isInitialized: false, error: null });
            render(<DashboardClient />);
            expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
        });

        it("renders skeleton when quizzes are loading", (): void => {
            (useQuizzes as Mock).mockReturnValue({ quizzes: [], isLoading: true, error: null });
            render(<DashboardClient />);
            expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
        });

        it("renders skeleton when stats are loading", (): void => {
            (useDashboardStats as Mock).mockReturnValue({ quizStats: new Map(), overallStats: null, isLoading: true });
            render(<DashboardClient />);
            expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
        });

        it("renders error state when database initialization fails", (): void => {
            const error = new Error("DB Init Failed");
            (useInitializeDatabase as Mock).mockReturnValue({ isInitialized: false, error });
            render(<DashboardClient />);
            expect(screen.getByText("Failed to initialize database")).toBeInTheDocument();
            expect(screen.getByText("DB Init Failed")).toBeInTheDocument();
        });

        it("renders empty state when no quizzes exist", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => {
                expect(screen.getByTestId("stats-bar-empty")).toBeInTheDocument();
            });
            expect(screen.getByText(/Complete quizzes to see your stats here/i)).toBeInTheDocument();
        });

        it("renders error alert when quizzes fail to load", async (): Promise<void> => {
            (useQuizzes as Mock).mockReturnValue({
                quizzes: [],
                isLoading: false,
                error: new Error("Failed to load quizzes")
            });
            render(<DashboardClient />);

            // Wait for DB initialization / SRS loading checks to pass
            await waitFor(() => {
                expect(screen.getByText(/Unable to load quizzes: Failed to load quizzes/i)).toBeInTheDocument();
            });
        });
    });

    describe("Happy Path Rendering", () => {
        it("renders dashboard content when data exists", async (): Promise<void> => {
            const mockQuizzes = [{ id: "q1", title: "Test Quiz 1", tags: [], questions: [] }];
            (useQuizzes as Mock).mockReturnValue({ quizzes: mockQuizzes, isLoading: false, error: null });
            (useDashboardStats as Mock).mockReturnValue({
                quizStats: new Map(),
                overallStats: { totalQuizzes: 1, totalAttempts: 5, averageScore: 80, totalStudyTime: 120 },
                isLoading: false
            });

            render(<DashboardClient />);

            await waitFor(() => {
                expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
            });

            expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
            expect(screen.getByTestId("due-questions-card")).toBeInTheDocument();
            expect(screen.getByTestId("interleaved-practice-card")).toBeInTheDocument();
            expect(screen.getByTestId("quiz-grid")).toBeInTheDocument();
            expect(screen.getByText("Count: 1")).toBeInTheDocument();
        });
    });

    describe("Filtering & Sorting", () => {
        const mockQuizzes = [
            {
                id: "q1",
                title: "AWS Security",
                category: "Cloud",
                tags: ["aws", "security"],
                questions: [],
                created_at: 1000
            },
            {
                id: "q2",
                title: "React Basics",
                category: "Frontend",
                tags: ["react", "js"],
                questions: [1, 2, 3],
                created_at: 2000
            },
            {
                id: "q3",
                title: "Node.js Advanced",
                category: "Backend",
                tags: ["node"],
                questions: [],
                created_at: 3000
            }
        ];

        const mockStatsMap = new Map();
        mockStatsMap.set("q1", { lastAttemptDate: 100, averageScore: 90 });
        mockStatsMap.set("q2", { lastAttemptDate: 200, averageScore: 50 });
        mockStatsMap.set("q3", { lastAttemptDate: 300, averageScore: 70 });

        beforeEach((): void => {
            (useQuizzes as Mock).mockReturnValue({ quizzes: mockQuizzes, isLoading: false });
            (useDashboardStats as Mock).mockReturnValue({
                quizStats: mockStatsMap,
                overallStats: { totalQuizzes: 3 },
                isLoading: false
            });
        });

        it("filters quizzes by search term", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("quiz-sort-controls")).toBeInTheDocument());

            expect(screen.getByText("AWS Security")).toBeInTheDocument();
            expect(screen.getByText("React Basics")).toBeInTheDocument();
            expect(screen.getByText("Node.js Advanced")).toBeInTheDocument();

            fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "AWS" } });

            await waitFor(() => {
                expect(screen.getByText("AWS Security")).toBeInTheDocument();
                expect(screen.queryByText("React Basics")).not.toBeInTheDocument();
            });

            fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Frontend" } });
            await waitFor(() => {
                expect(screen.queryByText("AWS Security")).not.toBeInTheDocument();
                expect(screen.getByText("React Basics")).toBeInTheDocument();
            });
        });

        it("filters quizzes by category", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("category-select")).toBeInTheDocument());

            fireEvent.change(screen.getByTestId("category-select"), { target: { value: "Backend" } });

            expect(screen.getByText("Node.js Advanced")).toBeInTheDocument();
            expect(screen.queryByText("AWS Security")).not.toBeInTheDocument();
            expect(screen.queryByText("React Basics")).not.toBeInTheDocument();
        });

        it("sorts quizzes by Recent (default)", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("quiz-grid")).toBeInTheDocument());

            // Recent = lastAttemptDate descending. q3(300) > q2(200) > q1(100)
            const items = screen.getAllByTestId(/^quiz-item-/);
            expect(items[0]).toHaveTextContent("Node.js Advanced");
            expect(items[1]).toHaveTextContent("React Basics");
            expect(items[2]).toHaveTextContent("AWS Security");
        });

        it("sorts quizzes by Performance", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("sort-select")).toBeInTheDocument());

            // Performance = averageScore ascending (Weakest first). q2(50) < q3(70) < q1(90)
            fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "performance" } });

            await waitFor(() => {
                const items = screen.getAllByTestId(/^quiz-item-/);
                expect(items[0]).toHaveTextContent("React Basics");
            });

            const items = screen.getAllByTestId(/^quiz-item-/);
            expect(items[0]).toHaveTextContent("React Basics"); // 50
            expect(items[1]).toHaveTextContent("Node.js Advanced"); // 70
            expect(items[2]).toHaveTextContent("AWS Security"); // 90
        });

        it("sorts quizzes by Title", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("sort-select")).toBeInTheDocument());

            fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "title" } });

            await waitFor(() => {
                const items = screen.getAllByTestId(/^quiz-item-/);
                expect(items[0]).toHaveTextContent("AWS Security");
            });

            const items = screen.getAllByTestId(/^quiz-item-/);
            expect(items[0]).toHaveTextContent("AWS Security");
            expect(items[1]).toHaveTextContent("Node.js Advanced");
            expect(items[2]).toHaveTextContent("React Basics");
        });
    });

    describe("Interactions", () => {
        const mockQuizzes = [{ id: "q1", title: "Test Quiz 1", tags: [], questions: [] }];

        beforeEach((): void => {
            (useQuizzes as Mock).mockReturnValue({ quizzes: mockQuizzes, isLoading: false });
            (useDashboardStats as Mock).mockReturnValue({
                quizStats: new Map(),
                overallStats: { totalQuizzes: 1 },
                isLoading: false
            });
        });

        it("opens ImportModal when import button is clicked", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("dashboard-header")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Import Quiz"));

            await waitFor(() => {
                expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
            });
        });

        it("opens DeleteConfirmModal when delete button is clicked", async (): Promise<void> => {
            const statsMap = new Map();
            statsMap.set("q1", { attemptCount: 5 });
            (useDashboardStats as Mock).mockReturnValue({ quizStats: statsMap, overallStats: {}, isLoading: false });

            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("quiz-grid")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Delete"));

            await waitFor(() => {
                expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
                expect(screen.getByTestId("mock-modal")).toHaveTextContent("Test Quiz 1");
                expect(screen.getByTestId("mock-modal")).toHaveTextContent("attemptCount");
            });
        });

        it("calls deleteQuiz and shows toast when confirmed", async (): Promise<void> => {
            const mockAddToast = vi.fn();
            (useToast as Mock).mockReturnValue({ addToast: mockAddToast });
            (deleteQuiz as Mock).mockResolvedValue(undefined);

            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("quiz-grid")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Delete"));
            await waitFor(() => expect(screen.getByTestId("mock-modal")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Confirm"));

            await waitFor(() => {
                expect(deleteQuiz).toHaveBeenCalledWith("q1", "user-123");
            });
            expect(mockAddToast).toHaveBeenCalledWith("success", expect.stringContaining("Deleted"));
        });

        it("persists sort preference to localStorage", async (): Promise<void> => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("sort-select")).toBeInTheDocument());

            fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "title" } });

            expect(setItemSpy).toHaveBeenCalledWith("dashboard-sort-by", "title");
            setItemSpy.mockRestore();
        });

        it("handles delete failure gracefully", async (): Promise<void> => {
            const mockAddToast = vi.fn();
            (useToast as Mock).mockReturnValue({ addToast: mockAddToast });
            (deleteQuiz as Mock).mockRejectedValue(new Error("Delete failed"));

            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("quiz-grid")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Delete"));
            await waitFor(() => expect(screen.getByTestId("mock-modal")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Confirm"));

            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("Failed to delete"));
            });
        });

        it("closes ImportModal", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("dashboard-header")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Import Quiz"));
            await waitFor(() => expect(screen.getByTestId("mock-modal")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Close"));
            await waitFor(() => expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument());
        });

        it("closes DeleteConfirmModal", async (): Promise<void> => {
            render(<DashboardClient />);
            await waitFor(() => expect(screen.getByTestId("quiz-grid")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Delete"));
            await waitFor(() => expect(screen.getByTestId("mock-modal")).toBeInTheDocument());

            fireEvent.click(screen.getByText("Close"));
            await waitFor(() => expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument());
        });
    });
});
