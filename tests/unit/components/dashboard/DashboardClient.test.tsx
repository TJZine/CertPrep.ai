import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardClient from "@/components/dashboard/DashboardClient";
import React from 'react';

// Define mocks outside to ensure hoisting compatibility
const mocks = vi.hoisted(() => ({
    useAuth: vi.fn(),
    useEffectiveUserId: vi.fn(),
    useInitializeDatabase: vi.fn(),
    useQuizzes: vi.fn(),
    useDashboardStats: vi.fn(),
    useToast: vi.fn(),
    getDueCountsByBox: vi.fn(),
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
}));

vi.mock("@/hooks/useDashboardStats", () => ({
    useDashboardStats: mocks.useDashboardStats,
}));

vi.mock("@/components/ui/Toast", () => ({
    useToast: mocks.useToast,
}));

vi.mock("@/db/quizzes", () => ({
    deleteQuiz: vi.fn(),
}));

vi.mock("@/db/srs", () => ({
    getDueCountsByBox: mocks.getDueCountsByBox,
}));

vi.mock("@/lib/prefetch", () => ({
    prefetchOnIdle: vi.fn().mockReturnValue(() => { }),
}));

// Mock components
vi.mock("@/components/dashboard/DashboardHeader", () => ({
    DashboardHeader: ({ onImportClick }: { onImportClick: () => void }): React.JSX.Element => (
        <div data-testid="dashboard-header">
            <button onClick={onImportClick}>Import Quiz</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/StatsBar", () => ({ StatsBar: (): React.JSX.Element => <div data-testid="stats-bar" /> }));
vi.mock("@/components/dashboard/QuizGrid", () => ({ QuizGrid: (): React.JSX.Element => <div data-testid="quiz-grid" /> }));
vi.mock("@/components/dashboard/QuizSortControls", () => ({ QuizSortControls: (): React.JSX.Element => <div data-testid="quiz-sort-controls" /> }));
vi.mock("@/components/srs/DueQuestionsCard", () => ({ DueQuestionsCard: (): React.JSX.Element => <div data-testid="due-questions-card" /> }));
vi.mock("@/components/dashboard/InterleavedPracticeCard", () => ({ InterleavedPracticeCard: (): React.JSX.Element => <div data-testid="interleaved-card" /> }));

vi.mock("@/components/dashboard/ImportModal", () => ({
    ImportModal: ({ isOpen }: { isOpen: boolean }): React.JSX.Element | null => (
        isOpen ? <div data-testid="import-modal">Import Modal Content</div> : null
    ),
}));

describe("DashboardClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default stable mock returns
        mocks.useAuth.mockReturnValue({ user: { id: "test-user" }, isLoading: false });
        mocks.useEffectiveUserId.mockReturnValue("test-user");
        mocks.useInitializeDatabase.mockReturnValue({ isInitialized: true, error: null });
        mocks.useQuizzes.mockReturnValue({ quizzes: [], isLoading: false, error: null });
        mocks.useDashboardStats.mockReturnValue({
            quizStats: new Map(),
            overallStats: { totalQuizzes: 0, totalAttempts: 0, averageScore: 0, totalStudyTime: 0 },
            isLoading: false
        });
        mocks.useToast.mockReturnValue({ addToast: vi.fn() });
        mocks.getDueCountsByBox.mockResolvedValue({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    it("renders the dashboard shell", async () => {
        render(<DashboardClient />);

        // Check if loading state resolves
        await waitFor(() => {
            expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
        });
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
});
