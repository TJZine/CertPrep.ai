import { describe, it, expect } from "vitest";
import { calculateRetryComparison } from "@/hooks/useAdvancedAnalytics";
import { createMockResult, daysAgo } from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";

describe("calculateRetryComparison", () => {
    describe("empty data handling", () => {
        it("returns all nulls for empty results", () => {
            const result = calculateRetryComparison([]);
            expect(result.firstAttemptAvg).toBeNull();
            expect(result.retryAvg).toBeNull();
            expect(result.avgImprovement).toBeNull();
        });
    });

    describe("first attempt vs retry calculation", () => {
        it("calculates improvement when retries score better", () => {
            const results: Result[] = [
                // Quiz 1: First 60%, retry 80%
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 60 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(2), score: 80 }),
            ];

            const result = calculateRetryComparison(results);
            expect(result.firstAttemptAvg).toBe(60);
            expect(result.retryAvg).toBe(80);
            expect(result.avgImprovement).toBe(20);
        });

        it("calculates negative improvement (regression) when retries score worse", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 80 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(2), score: 70 }),
            ];

            const result = calculateRetryComparison(results);
            expect(result.firstAttemptAvg).toBe(80);
            expect(result.retryAvg).toBe(70);
            expect(result.avgImprovement).toBe(-10);
        });

        it("returns null retryAvg when no quizzes have retries", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 75 }),
                createMockResult({ id: "r2", quiz_id: "quiz-2", timestamp: daysAgo(4), score: 80 }),
                createMockResult({ id: "r3", quiz_id: "quiz-3", timestamp: daysAgo(3), score: 85 }),
            ];

            const result = calculateRetryComparison(results);
            // Each quiz taken once = first attempts only
            expect(result.firstAttemptAvg).toBe(80); // (75 + 80 + 85) / 3 = 80
            expect(result.retryAvg).toBeNull();
            expect(result.avgImprovement).toBeNull();
        });
    });

    describe("multiple quizzes averaging", () => {
        it("averages across multiple quizzes correctly", () => {
            const results: Result[] = [
                // Quiz 1: First 60%, retry 80%
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(10), score: 60 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 80 }),
                // Quiz 2: First 70%, retry 90%
                createMockResult({ id: "r3", quiz_id: "quiz-2", timestamp: daysAgo(9), score: 70 }),
                createMockResult({ id: "r4", quiz_id: "quiz-2", timestamp: daysAgo(4), score: 90 }),
            ];

            const result = calculateRetryComparison(results);
            // First attempts: (60 + 70) / 2 = 65
            // Retries: (80 + 90) / 2 = 85
            expect(result.firstAttemptAvg).toBe(65);
            expect(result.retryAvg).toBe(85);
            expect(result.avgImprovement).toBe(20);
        });

        it("handles multiple retries for same quiz", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(10), score: 50 }), // First
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 60 }), // Retry 1
                createMockResult({ id: "r3", quiz_id: "quiz-1", timestamp: daysAgo(2), score: 70 }), // Retry 2
                createMockResult({ id: "r4", quiz_id: "quiz-1", timestamp: daysAgo(1), score: 80 }), // Retry 3
            ];

            const result = calculateRetryComparison(results);
            expect(result.firstAttemptAvg).toBe(50); // Only first attempt
            expect(result.retryAvg).toBe(70); // (60 + 70 + 80) / 3 = 70
            expect(result.avgImprovement).toBe(20);
        });
    });

    describe("mixed scenarios", () => {
        it("handles mix of quizzes with and without retries", () => {
            const results: Result[] = [
                // Quiz 1: Has retries
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(10), score: 60 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 80 }),
                // Quiz 2: No retries
                createMockResult({ id: "r3", quiz_id: "quiz-2", timestamp: daysAgo(8), score: 70 }),
            ];

            const result = calculateRetryComparison(results);
            // First attempts: (60 + 70) / 2 = 65
            // Retries: 80 (only one)
            expect(result.firstAttemptAvg).toBe(65);
            expect(result.retryAvg).toBe(80);
            expect(result.avgImprovement).toBe(15);
        });

        it("correctly identifies first attempt by timestamp order", () => {
            // Insert in non-chronological order
            const results: Result[] = [
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(2), score: 90 }),
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(10), score: 60 }),
            ];

            const result = calculateRetryComparison(results);
            // Should identify daysAgo(10) as first attempt
            expect(result.firstAttemptAvg).toBe(60);
            expect(result.retryAvg).toBe(90);
        });
    });

    describe("edge cases", () => {
        it("handles single result (first attempt only)", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", score: 75 }),
            ];

            const result = calculateRetryComparison(results);
            expect(result.firstAttemptAvg).toBe(75);
            expect(result.retryAvg).toBeNull();
            expect(result.avgImprovement).toBeNull();
        });

        it("handles zero improvement (same scores)", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", quiz_id: "quiz-1", timestamp: daysAgo(5), score: 75 }),
                createMockResult({ id: "r2", quiz_id: "quiz-1", timestamp: daysAgo(2), score: 75 }),
            ];

            const result = calculateRetryComparison(results);
            expect(result.avgImprovement).toBe(0);
        });
    });
});
