import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import {
    createMockResult,
    createMockQuiz,
    createMockQuestion,
    daysAgo,
} from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";

describe("useAdvancedAnalytics", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("empty data", () => {
        it("returns default values when no results", () => {
            const { result } = renderHook(() => useAdvancedAnalytics([], []));

            expect(result.current.readinessScore).toBe(0);
            expect(result.current.readinessConfidence).toBe("low");
            expect(result.current.currentStreak).toBe(0);
            expect(result.current.longestStreak).toBe(0);
            expect(result.current.firstAttemptAvg).toBeNull();
            expect(result.current.retryAvg).toBeNull();
        });
    });

    describe("with realistic data", () => {
        it("computes readiness and streaks from results", () => {
            const quizzes: Quiz[] = [
                createMockQuiz({
                    id: "quiz-1",
                    questions: [
                        createMockQuestion({ category: "Networking" }),
                        createMockQuestion({ category: "Security" }),
                    ],
                }),
            ];

            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    quiz_id: "quiz-1",
                    timestamp: daysAgo(0),
                    score: 85,
                    category_breakdown: { Networking: 90, Security: 80 },
                }),
                createMockResult({
                    id: "r2",
                    quiz_id: "quiz-1",
                    timestamp: daysAgo(1),
                    score: 80,
                    category_breakdown: { Networking: 85, Security: 75 },
                }),
            ];

            const { result } = renderHook(() => useAdvancedAnalytics(results, quizzes));

            expect(result.current.readinessScore).toBeGreaterThan(0);
            expect(result.current.currentStreak).toBe(2);
            expect(result.current.last7DaysActivity[0]).toBe(true);
            expect(result.current.last7DaysActivity[1]).toBe(true);
        });

        it("calculates retry improvement", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(10), score: 60 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 80 }),
            ];

            const { result } = renderHook(() => useAdvancedAnalytics(results, quizzes));

            expect(result.current.firstAttemptAvg).toBe(60);
            expect(result.current.retryAvg).toBe(80);
            expect(result.current.avgImprovement).toBe(20);
        });
    });

    describe("stability", () => {
        it("maintains referential equality when props remain same", () => {
            const quizzes = [createMockQuiz({ id: "q1" })];
            const results = [createMockResult({ id: "r1", quiz_id: "q1", score: 80 })];

            const { result, rerender } = renderHook(
                ({ r, q }) => useAdvancedAnalytics(r, q),
                { initialProps: { r: results, q: quizzes } }
            );

            const firstResult = result.current;
            rerender({ r: results, q: quizzes });
            const secondResult = result.current;

            expect(secondResult).toBe(firstResult);
        });
    });

    describe("confidence thresholds", () => {
        const quiz = createMockQuiz({ id: "q1" });

        it("returns low confidence for < 5 results", () => {
            const results = Array.from({ length: 4 }, (_, i) =>
                createMockResult({ id: `r${i}`, quiz_id: "q1" })
            );
            const { result } = renderHook(() => useAdvancedAnalytics(results, [quiz]));
            expect(result.current.readinessConfidence).toBe("low");
        });

        it("returns medium confidence for 5-9 results", () => {
            const results = Array.from({ length: 5 }, (_, i) =>
                createMockResult({ id: `r${i}`, quiz_id: "q1" })
            );
            const { result } = renderHook(() => useAdvancedAnalytics(results, [quiz]));
            expect(result.current.readinessConfidence).toBe("medium");
        });

        it("returns high confidence for >= 10 results", () => {
            const results = Array.from({ length: 10 }, (_, i) =>
                createMockResult({ id: `r${i}`, quiz_id: "q1" })
            );
            const { result } = renderHook(() => useAdvancedAnalytics(results, [quiz]));
            expect(result.current.readinessConfidence).toBe("high");
        });
    });

    describe("date boundaries", () => {
        const quiz = createMockQuiz({ id: "q1" });

        it("correctly tracks last 7 days activity", () => {
            const results = [
                createMockResult({ id: "today", quiz_id: "q1", timestamp: daysAgo(0) }),
                createMockResult({ id: "6daysAgo", quiz_id: "q1", timestamp: daysAgo(6) }),
                createMockResult({ id: "7daysAgo", quiz_id: "q1", timestamp: daysAgo(7) }), // Should be excluded from window
            ];

            const { result } = renderHook(() => useAdvancedAnalytics(results, [quiz]));

            expect(result.current.last7DaysActivity[0]).toBe(true); // Today
            expect(result.current.last7DaysActivity[6]).toBe(true); // 6 days ago
            // The hook returns exactly 7 items, index 0 to 6.
            // So we just verify the array length and specific slots.
            expect(result.current.last7DaysActivity).toHaveLength(7);

            // Verify all intermediate days are false (indices 1-5 had no activity)
            expect(result.current.last7DaysActivity.slice(1, 6).every(v => v === false)).toBe(true);
        });
    });
});
