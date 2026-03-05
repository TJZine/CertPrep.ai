
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizSessionStore, useCurrentQuestion, useProgress, useIsAnswered, useProctorStatus, useQuestionStatuses } from "@/stores/quizSessionStore";
import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";
import type { Question } from "@/types/quiz";
import { hashAnswer } from "@/lib/utils";

// Mock utils
vi.mock("@/lib/utils", () => ({
    hashAnswer: vi.fn(async (input: string) => `hashed_${input}`),
}));

describe("Quiz Session Store", () => {
    const mockQuestions: Question[] = [
        {
            id: "q1",
            question: "Q1",
            options: { a: "A", b: "B" },
            correct_answer_hash: "hashed_A",
            explanation: "Exp1",
            category: "Cat1",
        },
        {
            id: "q2",
            question: "Q2",
            options: { c: "C", d: "D" },
            correct_answer_hash: "hashed_C",
            explanation: "Exp2",
            category: "Cat1",
        },
    ];

    beforeEach(() => {
        act(() => {
            useQuizSessionStore.getState().resetSession();
        });
    });

    it("should initialize session correctly", () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
        });

        const state = useQuizSessionStore.getState();
        expect(state.quizId).toBe("quiz-1");
        expect(state.questions).toHaveLength(2);
        expect(state.currentIndex).toBe(0);
        expect(state.startTime).toBeDefined();
    });

    it("should navigate between questions", () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
        });

        // Next
        act(() => {
            useQuizSessionStore.getState().goToNextQuestion();
        });
        expect(useQuizSessionStore.getState().currentIndex).toBe(1);

        // Prev
        act(() => {
            useQuizSessionStore.getState().goToPreviousQuestion();
        });
        expect(useQuizSessionStore.getState().currentIndex).toBe(0);

        // Direct
        act(() => {
            useQuizSessionStore.getState().goToQuestion(1);
        });
        expect(useQuizSessionStore.getState().currentIndex).toBe(1);
    });

    it("should handle answer submission and hashing", async () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().selectAnswer("A");
        });

        expect(useQuizSessionStore.getState().selectedAnswer).toBe("A");

        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        const state = useQuizSessionStore.getState();
        const answer = state.answers.get("q1");

        expect(answer).toBeDefined();
        expect(answer?.isCorrect).toBe(true); // hashed_A === hashed_A
        expect(hashAnswer).toHaveBeenCalledWith("A");
        expect(state.hasSubmitted).toBe(true);
        expect(state.showExplanation).toBe(false); // Correct answers don't show explanation
    });

    it("should preserve selectedAnswer on hash failures for retry", async () => {
        const mockHashAnswer = vi.mocked(hashAnswer);
        const suppressError = vi.spyOn(console, "error").mockImplementation(() => { });
        // Both retry attempts fail
        mockHashAnswer.mockRejectedValueOnce(new Error("Hash failed"));
        mockHashAnswer.mockRejectedValueOnce(new Error("Hash failed"));

        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().selectAnswer("A");
        });

        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });
        await vi.waitFor(() => {
            expect(useQuizSessionStore.getState().error).not.toBeNull();
        });

        const state = useQuizSessionStore.getState();
        expect(state.error).toBe("Failed to submit answer. Please try again.");
        // KEY: selectedAnswer must be preserved so user can retry!
        expect(state.selectedAnswer).toBe("A");
        expect(state.isSubmitting).toBe(false);
        expect(state.hasSubmitted).toBe(false);
        expect(suppressError).toHaveBeenCalled();
        suppressError.mockRestore();
    });

    it("should show explanation on incorrect answer", async () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().selectAnswer("B");
        });

        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        const state = useQuizSessionStore.getState();
        const answer = state.answers.get("q1");

        expect(answer?.isCorrect).toBe(false);
        expect(state.showExplanation).toBe(true);
    });

    it("should complete session when finishing last question", () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().goToQuestion(1); // Last question
        });

        act(() => {
            useQuizSessionStore.getState().goToNextQuestion();
        });

        const state = useQuizSessionStore.getState();
        expect(state.isComplete).toBe(true);
        expect(state.endTime).toBeDefined();
    });

    it("should handle markAgain correctly (no re-queueing)", async () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeSession("quiz-1", "zen", mockQuestions);
        });

        // 1. Answer first question
        act(() => {
            useQuizSessionStore.getState().selectAnswer("A");
        });
        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        const initialQueueLength = useQuizSessionStore.getState().questions.length;

        // 2. Mark Again
        act(() => {
            useQuizSessionStore.getState().markAgain();
        });

        const state = useQuizSessionStore.getState();

        // Verify navigation
        expect(state.currentIndex).toBe(1);

        // Verify NO re-queueing (length should be same)
        expect(state.questions.length).toBe(initialQueueLength);
        expect(state.questionQueue.length).toBe(initialQueueLength);

        // Verify difficulty marked
        const answer = state.answers.get("q1");
        expect(answer?.difficulty).toBe("again");
    });

    it("should handle Proctor Mode specific logic", () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeProctorSession("quiz-1", mockQuestions, 60);
        });

        const state = useQuizSessionStore.getState();
        expect(state.mode).toBe("proctor");
        expect(state.timeRemaining).toBe(3600);

        // Proctor mode often tracks seen questions
        expect(state.seenQuestions.has("q1")).toBe(true);

        // Navigation in proctor mode
        act(() => {
            useQuizSessionStore.getState().navigateToQuestion(1);
        });
        expect(useQuizSessionStore.getState().seenQuestions.has("q2")).toBe(true);
    });
    it("should handle selectAnswerProctor and hashing", async () => {
        act(() => {
            useQuizSessionStore
                .getState()
                .initializeProctorSession("quiz-1", mockQuestions, 60);
            useQuizSessionStore.getState().selectAnswerProctor("A");
        });

        const state = useQuizSessionStore.getState();
        expect(state.isSubmitting).toBe(true);
        expect(state.selectedAnswer).toBe("A");

        await vi.waitFor(() => {
            expect(useQuizSessionStore.getState().isSubmitting).toBe(false);
        });

        const finalState = useQuizSessionStore.getState();
        const answer = finalState.answers.get("q1");

        expect(answer).toBeDefined();
        expect(answer?.isCorrect).toBe(true);
        expect(finalState.answeredQuestions.has("q1")).toBe(true);
        expect(finalState.seenQuestions.has("q1")).toBe(true);
    });

    it("should handle error in selectAnswerProctor", async () => {
        const mockHashAnswer = vi.mocked(hashAnswer);
        const suppressError = vi.spyOn(console, "error").mockImplementation(() => { });
        mockHashAnswer.mockRejectedValueOnce(new Error("Hash failed"));
        mockHashAnswer.mockRejectedValueOnce(new Error("Hash failed"));

        act(() => {
            useQuizSessionStore
                .getState()
                .initializeProctorSession("quiz-1", mockQuestions, 60);
            useQuizSessionStore.getState().selectAnswerProctor("A");
        });

        await vi.waitFor(() => {
            expect(useQuizSessionStore.getState().error).not.toBeNull();
        });

        const state = useQuizSessionStore.getState();
        expect(state.error).toBe("We could not save your answer. Please try again.");
        expect(state.isSubmitting).toBe(false);
        expect(suppressError).toHaveBeenCalled();
        suppressError.mockRestore();
    });

    it("should markHard and markGood correctly", async () => {
        act(() => {
            useQuizSessionStore.getState().initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().selectAnswer("A");
        });
        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        act(() => {
            useQuizSessionStore.getState().markHard();
        });

        expect(useQuizSessionStore.getState().hardQuestions.has("q1")).toBe(true);
        expect(useQuizSessionStore.getState().answers.get("q1")?.difficulty).toBe("hard");

        // Now we are on q2 because markHard calls goToNextQuestion
        act(() => {
            useQuizSessionStore.getState().selectAnswer("C");
        });
        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        act(() => {
            useQuizSessionStore.getState().markGood();
        });

        expect(useQuizSessionStore.getState().answers.get("q2")?.difficulty).toBe("good");
    });

    it("should manage time and warnings", () => {
        act(() => {
            useQuizSessionStore.getState().updateTimeRemaining(600);
        });
        expect(useQuizSessionStore.getState().timeRemaining).toBe(600);
        expect(useQuizSessionStore.getState().isTimeWarning).toBe(false);

        act(() => {
            useQuizSessionStore.getState().updateTimeRemaining(150); // Warning threshold defaults to 300
        });
        expect(useQuizSessionStore.getState().isTimeWarning).toBe(true);

        act(() => {
            useQuizSessionStore.getState().setTimeWarning(false);
        });
        expect(useQuizSessionStore.getState().isTimeWarning).toBe(false);
    });

    it("should handle exam submission", () => {
        act(() => {
            useQuizSessionStore.getState().initializeSession("quiz-1", "zen", mockQuestions);
        });
        expect(useQuizSessionStore.getState().canSubmitExam()).toBe(true);

        act(() => {
            useQuizSessionStore.getState().submitExam();
        });
        expect(useQuizSessionStore.getState().isComplete).toBe(true);
        expect(useQuizSessionStore.getState().isAutoSubmitted).toBe(false);
        expect(useQuizSessionStore.getState().canSubmitExam()).toBe(false);

        act(() => {
            useQuizSessionStore.getState().resetSession();
            useQuizSessionStore.getState().initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().autoSubmitExam();
        });
        expect(useQuizSessionStore.getState().isComplete).toBe(true);
        expect(useQuizSessionStore.getState().isAutoSubmitted).toBe(true);
    });

    it("should toggle explanation and flag", () => {
        act(() => {
            useQuizSessionStore.getState().toggleExplanation();
        });
        expect(useQuizSessionStore.getState().showExplanation).toBe(true);

        act(() => {
            useQuizSessionStore.getState().toggleFlag("q1");
        });
        expect(useQuizSessionStore.getState().flaggedQuestions.has("q1")).toBe(true);
        expect(useQuizSessionStore.getState().isQuestionFlagged("q1")).toBe(true);

        act(() => {
            useQuizSessionStore.getState().toggleFlag("q1");
        });
        expect(useQuizSessionStore.getState().flaggedQuestions.has("q1")).toBe(false);
    });

    it("should compute getters for answered and flagged states", async () => {
        act(() => {
            useQuizSessionStore.getState().initializeSession("quiz-1", "zen", mockQuestions);
        });

        expect(useQuizSessionStore.getState().getCurrentQuestion()).toEqual(mockQuestions[0]);
        expect(useQuizSessionStore.getState().getUnansweredCount()).toBe(2);

        act(() => {
            useQuizSessionStore.getState().selectAnswer("A");
        });
        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        expect(useQuizSessionStore.getState().isQuestionAnswered("q1")).toBe(true);
        expect(useQuizSessionStore.getState().getAnswerForQuestion("q1")).toBeDefined();
        expect(useQuizSessionStore.getState().getAnsweredCount()).toBe(1);
        expect(useQuizSessionStore.getState().getUnansweredCount()).toBe(1);

        expect(useQuizSessionStore.getState().getQuestionStatus("q1")).toBe("answered");

        act(() => {
            useQuizSessionStore.getState().toggleFlag("q2");
        });
        expect(useQuizSessionStore.getState().getQuestionStatus("q2")).toBe("flagged");
        expect(useQuizSessionStore.getState().getFlaggedCount()).toBe(1);

        act(() => {
            useQuizSessionStore.getState().markQuestionSeen("q2");
        });
        expect(useQuizSessionStore.getState().getQuestionStatus("q2")).toBe("flagged"); // Flagged takes precedence

        act(() => {
            useQuizSessionStore.getState().toggleFlag("q2"); // Unflag
        });
        expect(useQuizSessionStore.getState().getQuestionStatus("q2")).toBe("seen");

    });

    it("should compute progress/session duration and clear errors", async () => {
        act(() => {
            useQuizSessionStore.getState().initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().selectAnswer("A");
        });
        await act(async () => {
            useQuizSessionStore.getState().submitAnswer();
        });

        expect(useQuizSessionStore.getState().getProgress().percentage).toBe(50);
        expect(useQuizSessionStore.getState().getSessionDuration()).toBeGreaterThanOrEqual(0);

        act(() => {
            useQuizSessionStore.getState().clearError();
        });
        expect(useQuizSessionStore.getState().error).toBeNull();
    });

    it("should test react hooks selectors", () => {
        act(() => {
            useQuizSessionStore.getState().initializeSession("quiz-1", "zen", mockQuestions);
            useQuizSessionStore.getState().toggleFlag("q1");
        });

        const { result: currentQ } = renderHook(() => useCurrentQuestion());
        expect(currentQ.current?.id).toBe("q1");

        const { result: progress } = renderHook(() => useProgress());
        expect(progress.current.total).toBe(2);
        expect(progress.current.current).toBe(0);

        const { result: isAnswered } = renderHook(() => useIsAnswered());
        expect(isAnswered.current).toBe(false);

        const { result: proctorStatus } = renderHook(() => useProctorStatus());
        expect(proctorStatus.current.totalQuestions).toBe(2);

        const { result: questionStatuses } = renderHook(() => useQuestionStatuses());
        expect(questionStatuses.current[0]?.status).toBe("flagged");
        expect(questionStatuses.current[1]?.status).toBe("unseen");
    });
});
