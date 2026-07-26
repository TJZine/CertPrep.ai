import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useExamSubmission } from "@/hooks/useExamSubmission";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import * as ResultsDB from "@/db/results";
import { useSync } from "@/hooks/useSync";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import { ResultCompletionError } from "@/db/resultErrors";

// Mock dependencies
vi.mock("@/stores/quizSessionStore");
vi.mock("@/db/results");
vi.mock("@/hooks/useSync");
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));
vi.mock("@/components/ui/Toast", () => ({
    useToast: vi.fn(),
}));
vi.mock("@/components/providers/AuthProvider", () => ({
    useAuth: vi.fn(),
}));

describe("useExamSubmission", () => {
    const mockSubmitExam = vi.fn();
    const mockAutoSubmitExam = vi.fn();
    const mockSync = vi.fn();
    const mockRouterPush = vi.fn();
    const mockAddToast = vi.fn();
    const mockPauseTimer = vi.fn();

    const mockQuiz: Quiz = {
        id: "quiz-123",
        user_id: "user-123",
        title: "Test Quiz",
        description: "Test Description",
        created_at: Date.now(),
        updated_at: Date.now(),
        questions: [],
        tags: [],
        version: 1,
    };

    const defaultProps = {
        quiz: mockQuiz,
        effectiveUserId: "user-123",
        durationMinutes: 60,
        timeRemaining: 3000,
        pauseTimer: mockPauseTimer,
        answers: new Map([["q1", { selectedAnswer: "A" }]]),
        flaggedQuestions: new Set(["q2"]),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useQuizSessionStore).mockReturnValue({
            submitExam: mockSubmitExam,
            autoSubmitExam: mockAutoSubmitExam,
            initializeProctorSession: vi.fn(),
            selectAnswerProctor: vi.fn(),
            navigateToQuestion: vi.fn(),
            goToNextQuestion: vi.fn(),
            goToPreviousQuestion: vi.fn(),
            toggleFlag: vi.fn(),
            updateTimeRemaining: vi.fn(),
            resetSession: vi.fn(),
            currentIndex: 0,
            selectedAnswer: null,
            flaggedQuestions: new Set(),
            answers: new Map(),
            isComplete: false,
            error: null,
            clearError: vi.fn(),
        });

        vi.spyOn(ResultsDB, "createResult").mockResolvedValue({ id: "result-123" } as Result);

        vi.mocked(useSync).mockReturnValue({
            sync: mockSync.mockResolvedValue({ success: true }),
            isSyncing: false,
            hasInitialSyncCompleted: true,
            initialSyncError: null,
            syncBlocked: null,
        });

        vi.mocked(useRouter).mockReturnValue({
            push: mockRouterPush,
            back: vi.fn(),
            forward: vi.fn(),
            refresh: vi.fn(),
            replace: vi.fn(),
            prefetch: vi.fn(),
        });

        vi.mocked(useToast).mockReturnValue({
            addToast: mockAddToast,
            toasts: [],
            removeToast: vi.fn(),
        });

        vi.mocked(useAuth).mockReturnValue({
            user: { id: "user-123" },
        } as ReturnType<typeof useAuth>);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("handles manual submission correctly", async () => {
        const { result } = renderHook(() => useExamSubmission(defaultProps));

        await act(async () => {
            await result.current.handleSubmitExam();
        });

        // Verify store actions
        expect(mockPauseTimer).toHaveBeenCalled();
        expect(mockSubmitExam).toHaveBeenCalled();

        // Verify DB creation
        expect(ResultsDB.createResult).toHaveBeenCalledWith(
            expect.objectContaining({
                quizId: "quiz-123",
                userId: "user-123",
                mode: "proctor",
                answers: { q1: "A" },
                flaggedQuestions: ["q2"],
            })
        );

        // Verify sync and navigation
        expect(mockSync).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith("/results/result-123");
        expect(mockAddToast).toHaveBeenCalledWith("success", expect.stringContaining("submitted"));
    });

    it("handles auto submission correctly", async () => {
        const { result } = renderHook(() => useExamSubmission(defaultProps));

        let submissionResult: string | null = null;
        await act(async () => {
            submissionResult = await result.current.handleAutoSubmit();
        });

        expect(mockPauseTimer).toHaveBeenCalled();
        expect(mockAutoSubmitExam).toHaveBeenCalled();
        expect(submissionResult).toBe("result-123");
        expect(result.current.showTimeUpModal).toBe(true);

        // Should NOT navigate yet
        expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it("prevents double submission (race condition)", async () => {
        const { result } = renderHook(() => useExamSubmission(defaultProps));

        // First submission
        await act(async () => {
            await result.current.handleSubmitExam();
        });

        // Reset mocks to ensure they aren't called again
        vi.clearAllMocks();

        // Second submission attempt
        await act(async () => {
            await result.current.handleAutoSubmit();
        });

        expect(ResultsDB.createResult).not.toHaveBeenCalled();
        expect(mockSubmitExam).not.toHaveBeenCalled();
    });

    it("handles missing user ID gracefully", async () => {
        const propsWithoutUser = { ...defaultProps, effectiveUserId: null };
        const { result } = renderHook(() => useExamSubmission(propsWithoutUser));

        await act(async () => {
            await result.current.handleSubmitExam();
        });

        expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("no user context"));
        expect(ResultsDB.createResult).not.toHaveBeenCalled();
    });

    it("preserves a guest manual result without attempting remote sync", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.mocked(useAuth).mockReturnValue({
            user: null,
        } as ReturnType<typeof useAuth>);

        const guestProps = {
            ...defaultProps,
            effectiveUserId: "guest-user-123",
        };
        const { result } = renderHook(() => useExamSubmission(guestProps));

        await act(async () => {
            await result.current.handleSubmitExam();
        });

        expect(ResultsDB.createResult).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "guest-user-123" }),
        );
        expect(mockRouterPush).toHaveBeenCalledWith("/results/result-123");
        expect(mockSync).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
        expect(consoleWarn).not.toHaveBeenCalled();
    });

    it("preserves a guest auto-submit result without attempting remote sync", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.mocked(useAuth).mockReturnValue({
            user: null,
        } as ReturnType<typeof useAuth>);

        const guestProps = {
            ...defaultProps,
            effectiveUserId: "guest-user-123",
        };
        const { result } = renderHook(() => useExamSubmission(guestProps));

        let resultId: string | null = null;
        await act(async () => {
            resultId = await result.current.handleAutoSubmit();
        });

        expect(resultId).toBe("result-123");
        expect(ResultsDB.createResult).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "guest-user-123" }),
        );
        expect(mockSync).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
        expect(consoleWarn).not.toHaveBeenCalled();
    });

    it("keeps authenticated sync failures observable", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mockSync.mockResolvedValueOnce({
            success: false,
            error: "Network unavailable",
        });
        const { result } = renderHook(() => useExamSubmission(defaultProps));

        await act(async () => {
            await result.current.handleSubmitExam();
        });

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalledWith(
                "Failed to sync results after submit:",
                "Network unavailable",
            );
        });
    });

    it("handles createResult failure gracefully", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.mocked(ResultsDB.createResult).mockRejectedValueOnce(new Error("DB Error"));

        const { result } = renderHook(() => useExamSubmission(defaultProps));

        await act(async () => {
            await result.current.handleSubmitExam();
        });

        expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("Failed to submit"));
        expect(mockRouterPush).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("routes to the dashboard instead of offering retry for a permanent failure", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(ResultsDB.createResult).mockRejectedValueOnce(
            new ResultCompletionError(
                "QUIZ_UNAVAILABLE",
                "Quiz is no longer available for completion.",
            ),
        );
        const { result } = renderHook(() => useExamSubmission(defaultProps));

        await act(async () => {
            await result.current.handleSubmitExam();
        });

        expect(mockAddToast).toHaveBeenCalledWith(
            "error",
            expect.stringContaining("no longer available"),
        );
        expect(mockRouterPush).toHaveBeenCalledWith("/");
        consoleSpy.mockRestore();
    });
});
