/**
 * Integration tests for useAdvancedAnalytics
 *
 * Since @testing-library/react is not available in this project,
 * we test the underlying calculation composition directly.
 * The hook itself is a thin wrapper that calls the pure functions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    calculateReadiness,
    calculateStreaks,
    calculateCategoryTrends,
    calculateRetryComparison,
} from "@/hooks/useAdvancedAnalytics";
import {
    createMockResult,
    createMockQuiz,
    createMockQuestion,
    daysAgo,
} from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";

describe("useAdvancedAnalytics - Calculation Integration", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15, 2024
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("empty data behavior", () => {
        it("calculateReadiness returns defaults for empty data", () => {
            const result = calculateReadiness([], []);
            expect(result.score).toBe(0);
            expect(result.confidence).toBe("low");
            expect(result.categoryReadiness.size).toBe(0);
        });

        it("calculateStreaks returns defaults for empty data", () => {
            const result = calculateStreaks([]);
            expect(result.current).toBe(0);
            expect(result.longest).toBe(0);
            expect(result.consistency).toBe(0);
            expect(result.last7Days).toHaveLength(7);
            expect(result.last7Days.every((v) => v === false)).toBe(true);
        });

        it("calculateCategoryTrends returns empty map for empty data", () => {
            const trends = calculateCategoryTrends([]);
            expect(trends.size).toBe(0);
        });

        it("calculateRetryComparison returns nulls for empty data", () => {
            const result = calculateRetryComparison([]);
            expect(result.firstAttemptAvg).toBeNull();
            expect(result.retryAvg).toBeNull();
            expect(result.avgImprovement).toBeNull();
        });
    });

    describe("full computation with realistic data", () => {
        it("computes all metrics correctly when given valid input", () => {
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

            // Test readiness
            const readiness = calculateReadiness(results, quizzes);
            expect(readiness.score).toBeGreaterThan(0);
            expect(readiness.categoryReadiness.size).toBe(2);
            expect(readiness.confidence).toBe("low"); // 2 results < 5

            // Test streaks
            const streaks = calculateStreaks(results);
            expect(streaks.current).toBe(2);
            expect(streaks.last7Days[0]).toBe(true); // Today
            expect(streaks.last7Days[1]).toBe(true); // Yesterday
        });
    });

    describe("complex realistic scenario", () => {
        it("handles 10 results for high confidence", () => {
            const quizzes: Quiz[] = [
                createMockQuiz({
                    id: "quiz-1",
                    questions: [
                        createMockQuestion({ category: "Networking" }),
                        createMockQuestion({ category: "Security" }),
                    ],
                }),
                createMockQuiz({
                    id: "quiz-2",
                    questions: [createMockQuestion({ category: "Compute" })],
                }),
            ];

            // Build 10 results for high confidence
            const results: Result[] = Array.from({ length: 10 }, (_, i) =>
                createMockResult({
                    id: `r${i}`,
                    quiz_id: i % 2 === 0 ? "quiz-1" : "quiz-2",
                    timestamp: daysAgo(i),
                    score: 70 + i * 2,
                    category_breakdown:
                        i % 2 === 0
                            ? { Networking: 75 + i, Security: 70 + i }
                            : { Compute: 80 + i },
                }),
            );

            const readiness = calculateReadiness(results, quizzes);
            expect(readiness.confidence).toBe("high"); // 10 results
            expect(readiness.categoryReadiness.size).toBeGreaterThanOrEqual(2);

            const streaks = calculateStreaks(results);
            expect(streaks.consistency).toBeGreaterThan(0);
        });

        it("calculates improving trend with sufficient data", () => {
            const results: Result[] = [
                // Last 3 (most recent) - high scores
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Test: 90 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Test: 88 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Test: 85 } }),
                // Prior 3 - lower scores
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Test: 60 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Test: 58 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Test: 55 } }),
            ];

            const trends = calculateCategoryTrends(results);
            expect(trends.get("Test")).toBe("improving");
        });

        it("calculates retry improvement correctly", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(10), score: 60 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 80 }),
            ];

            const retry = calculateRetryComparison(results);
            expect(retry.firstAttemptAvg).toBe(60);
            expect(retry.retryAvg).toBe(80);
            expect(retry.avgImprovement).toBe(20);
        });
    });
});
