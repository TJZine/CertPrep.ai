
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useQuizGrading } from "@/hooks/useQuizGrading";
import type { Quiz } from "@/types/quiz";

// Mock hashAnswer
vi.mock("@/lib/utils", () => ({
    hashAnswer: vi.fn(async (input: string) => `hashed_${input}`),
}));

describe("useQuizGrading Hook", () => {
    const mockQuiz: Quiz = {
        id: "quiz-1",
        user_id: "user-1",
        tags: ["tag1"],
        version: 1,
        title: "Test Quiz",
        description: "Desc",
        questions: [
            {
                id: "q1",
                question: "Q1",
                options: { a: "A", b: "B" },
                correct_answer_hash: "hashed_A",
                category: "Cat1",
                explanation: "Exp1",
            },
            {
                id: "q2",
                question: "Q2",
                options: { x: "X", y: "Y" },
                correct_answer_hash: "hashed_Y",
                category: "Cat1",
                explanation: "Exp2",
            },
        ],
        created_at: Date.now(),
        updated_at: Date.now(),
    };

    it("should return null grading initially", () => {
        const { result } = renderHook(() => useQuizGrading(mockQuiz, {}));
        expect(result.current.grading).toBeNull();
        // It starts loading immediately in useEffect, but initial render is null
        expect(result.current.isLoading).toBe(true);
    });

    it("should grade correct answers correctly", async () => {
        const answers = { q1: "A", q2: "Y" };
        const { result } = renderHook(() => useQuizGrading(mockQuiz, answers));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.grading).toEqual({
            correctCount: 2,
            incorrectCount: 0,
            unansweredCount: 0,
            questionStatus: { q1: true, q2: true },
        });
    });

    it("should grade mixed answers correctly", async () => {
        const answers = { q1: "A", q2: "X" }; // q2 is wrong
        const { result } = renderHook(() => useQuizGrading(mockQuiz, answers));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.grading).toEqual({
            correctCount: 1,
            incorrectCount: 1,
            unansweredCount: 0,
            questionStatus: { q1: true, q2: false },
        });
    });

    it("should handle unanswered questions", async () => {
        const answers = { q1: "A" }; // q2 missing
        const { result } = renderHook(() => useQuizGrading(mockQuiz, answers));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.grading).toEqual({
            correctCount: 1,
            incorrectCount: 0,
            unansweredCount: 1,
            questionStatus: { q1: true, q2: false },
        });
    });

    it("should filter questions if questionIds provided (Smart Round)", async () => {
        const answers = { q1: "A", q2: "Y" };
        // Only request grading for q2
        const { result } = renderHook(() =>
            useQuizGrading(mockQuiz, answers, ["q2"]),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.grading).toEqual({
            correctCount: 1, // Only q2 counted
            incorrectCount: 0,
            unansweredCount: 0,
            questionStatus: { q2: true }, // q1 not present
        });
    });

    it("should handle null quiz gracefully", async () => {
        const { result } = renderHook(() => useQuizGrading(null, {}));
        expect(result.current.grading).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });
});
