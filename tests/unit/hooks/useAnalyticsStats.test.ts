
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAnalyticsStats } from "@/hooks/useAnalyticsStats";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

// Mock hashAnswer
vi.mock("@/lib/utils", () => ({
    hashAnswer: vi.fn(async (input: string) => `hashed_${input}`),
}));

// Mock Trends Calculation
vi.mock("@/lib/analytics/trends", () => ({
    calculateCategoryTrends: vi.fn(() => new Map()),
}));

describe("useAnalyticsStats Hook", () => {
    const mockQuiz: Quiz = {
        id: "quiz-1",
        user_id: "user-1",
        version: 1,
        tags: [],
        title: "Test Quiz",
        description: "Desc",
        created_at: Date.now(),
        updated_at: Date.now(),
        questions: [
            {
                id: "q1",
                question: "Q1",
                options: { a: "A", b: "B" },
                correct_answer_hash: "hashed_A",
                category: "Math",
                explanation: "Exp1",
            },
            {
                id: "q2",
                question: "Q2",
                options: { a: "A", b: "B" },
                correct_answer_hash: "hashed_B",
                category: "Math",
                explanation: "Exp2",
            },
            {
                id: "q3",
                question: "Q3",
                options: { a: "A", b: "B" },
                correct_answer_hash: "hashed_A",
                category: "Science",
                explanation: "Exp3",
            },
        ],
    };

    const mockResult: Result = {
        id: "res-1",
        quiz_id: "quiz-1",
        user_id: "user-1",
        score: 100,
        timestamp: Date.now(),
        time_taken_seconds: 60,
        mode: "zen",
        flagged_questions: [],
        category_breakdown: { Math: 100, Science: 100 },
        answers: {
            q1: "A", // Correct
            q2: "B", // Correct
            q3: "A", // Correct
        },
        question_ids: ["q1", "q2", "q3"], // All questions
    };

    it("should calculate category performance correctly", async () => {
        const { result } = renderHook(() =>
            useAnalyticsStats([mockResult], [mockQuiz]),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        /*
          Math: 2 questions, both correct -> 100%
          Science: 1 question, correct -> 100%
        */
        const mathStats = result.current.categoryPerformance.find(
            (c) => c.category === "Math",
        );
        expect(mathStats).toBeDefined();
        expect(mathStats?.correct).toBe(2);
        expect(mathStats?.total).toBe(2);
        expect(mathStats?.score).toBe(100);

        const scienceStats = result.current.categoryPerformance.find(
            (c) => c.category === "Science",
        );
        expect(scienceStats?.correct).toBe(1);
        expect(scienceStats?.total).toBe(1);
    });

    it("should identify weak areas (< 70% score)", async () => {
        // Create a result with poor performance
        const poorResult: Result = {
            ...mockResult,
            id: "res-bad",
            answers: {
                q1: "B", // Incorrect
                q2: "A", // Incorrect
                q3: "A", // Correct
            },
        };

        // Need at least 3 questions total in a category to be a "weak area" candidate per implementation
        // Math has 2 questions... we need more data to trigger "weak area".
        // Let's create multiple results to boost the total count for Math > 2 (currently 2).
        // Duplicate results count towards total questions seen.

        const { result } = renderHook(() =>
            useAnalyticsStats([poorResult, poorResult], [mockQuiz]),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Math: 0/2 correct per result * 2 results = 0/4 correct = 0% score. Total > 3.
        // Should be a weak area.
        const weakArea = result.current.weakAreas.find(
            (w) => w.category === "Math",
        );
        expect(weakArea).toBeDefined();
        expect(weakArea?.avgScore).toBe(0);
    });

    it("should calculate daily study time", async () => {
        const { result } = renderHook(() =>
            useAnalyticsStats([mockResult], [mockQuiz]),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Today should have 1 minute (60 seconds)
        const today = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        const todayStats = result.current.dailyStudyTime.find(
            (d) => d.date === today,
        );
        expect(todayStats?.minutes).toBe(1);
    });

    it("should handle empty data gracefully", async () => {
        const { result } = renderHook(() => useAnalyticsStats([], []));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.categoryPerformance).toEqual([]);
        expect(result.current.weakAreas).toEqual([]);
        expect(result.current.dailyStudyTime).toEqual([]);
    });
});
