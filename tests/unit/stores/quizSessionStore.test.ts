
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { act } from "@testing-library/react";
import type { Question } from "@/types/quiz";

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
        expect(state.hasSubmitted).toBe(true);
        expect(state.showExplanation).toBe(false); // Correct = no explanation usually? Store says: draft.showExplanation = !isCorrect;
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
