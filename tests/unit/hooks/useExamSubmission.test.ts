import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExamSubmission } from "@/hooks/useExamSubmission";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import * as ResultsDB from "@/db/results";
import { useSync } from "@/hooks/useSync";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

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
});
