
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
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
            // Wait for error to be set (async operation completes)
            await vi.waitFor(() => useQuizSessionStore.getState().error !== null);
        });

        const state = useQuizSessionStore.getState();
        expect(state.error).toBe("Failed to submit answer. Please try again.");
        // KEY: selectedAnswer must be preserved so user can retry!
        expect(state.selectedAnswer).toBe("A");
        expect(state.isSubmitting).toBe(false);
        expect(state.hasSubmitted).toBe(false);
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
});
