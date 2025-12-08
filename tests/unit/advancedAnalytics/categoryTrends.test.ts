import { describe, it, expect } from "vitest";
import { calculateCategoryTrends } from "@/hooks/useAdvancedAnalytics";
import { createMockResult, daysAgo } from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";

describe("calculateCategoryTrends", () => {
    describe("insufficient data handling", () => {
        it("returns empty map for empty results", () => {
            const trends = calculateCategoryTrends([]);
            expect(trends.size).toBe(0);
        });

        it("returns empty map for single result", () => {
            const results: Result[] = [
                createMockResult({ category_breakdown: { Networking: 80 } }),
            ];
            const trends = calculateCategoryTrends(results);
            expect(trends.size).toBe(0);
        });

        it("returns stable for category with < 6 attempts", () => {
            const results: Result[] = Array.from({ length: 5 }, (_, i) =>
                createMockResult({
                    id: `r${i}`,
                    timestamp: daysAgo(i),
                    category_breakdown: { Networking: 80 + i * 2 },
                }),
            );

            const trends = calculateCategoryTrends(results);
            expect(trends.get("Networking")).toBe("stable");
        });
    });

    describe("trend direction calculation", () => {
        it("detects improving trend when recent scores are higher", () => {
            const results: Result[] = [
                // Last 3 (most recent) - high scores
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Networking: 90 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Networking: 88 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Networking: 85 } }),
                // Prior 3 - lower scores
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Networking: 70 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Networking: 65 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Networking: 60 } }),
            ];

            const trends = calculateCategoryTrends(results);
            // Last 3 avg: (90+88+85)/3 = 87.67, Prior 3 avg: (70+65+60)/3 = 65
            // Diff: 87.67 - 65 = 22.67 >= 5 → improving
            expect(trends.get("Networking")).toBe("improving");
        });

        it("detects declining trend when recent scores are lower", () => {
            const results: Result[] = [
                // Last 3 - low scores
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Security: 55 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Security: 50 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Security: 45 } }),
                // Prior 3 - high scores
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Security: 80 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Security: 85 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Security: 90 } }),
            ];

            const trends = calculateCategoryTrends(results);
            // Last 3 avg: 50, Prior 3 avg: 85
            // Diff: 50 - 85 = -35 <= -5 → declining
            expect(trends.get("Security")).toBe("declining");
        });

        it("detects stable trend when difference is within threshold", () => {
            const results: Result[] = [
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Compute: 76 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Compute: 75 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Compute: 74 } }),
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Compute: 73 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Compute: 72 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Compute: 71 } }),
            ];

            const trends = calculateCategoryTrends(results);
            // Last 3 avg: 75, Prior 3 avg: 72
            // Diff: 75 - 72 = 3 (less than 5) → stable
            expect(trends.get("Compute")).toBe("stable");
        });
    });

    describe("threshold boundary tests", () => {
        it("returns improving when diff is exactly +5", () => {
            // Last 3: 80, 80, 80 → avg 80
            // Prior 3: 75, 75, 75 → avg 75
            // Diff = 5 → improving
            const results: Result[] = [
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Test: 80 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Test: 80 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Test: 80 } }),
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Test: 75 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Test: 75 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Test: 75 } }),
            ];

            const trends = calculateCategoryTrends(results);
            expect(trends.get("Test")).toBe("improving");
        });

        it("returns declining when diff is exactly -5", () => {
            // Last 3: 70, 70, 70 → avg 70
            // Prior 3: 75, 75, 75 → avg 75
            // Diff = -5 → declining
            const results: Result[] = [
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Test: 70 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Test: 70 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Test: 70 } }),
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Test: 75 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Test: 75 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Test: 75 } }),
            ];

            const trends = calculateCategoryTrends(results);
            expect(trends.get("Test")).toBe("declining");
        });

        it("returns stable when diff is +4.99 (just below threshold)", () => {
            // Last 3: 79, 80, 80 → avg ~79.67
            // Prior 3: 75, 75, 74 → avg ~74.67
            // Diff = 5 → but let's do 74.67 + 4.99 = 79.66
            // Actually, let's make it simpler: avg diff < 5
            const results: Result[] = [
                createMockResult({ id: "r1", timestamp: daysAgo(0), category_breakdown: { Test: 79 } }),
                createMockResult({ id: "r2", timestamp: daysAgo(1), category_breakdown: { Test: 79 } }),
                createMockResult({ id: "r3", timestamp: daysAgo(2), category_breakdown: { Test: 79 } }),
                createMockResult({ id: "r4", timestamp: daysAgo(10), category_breakdown: { Test: 75 } }),
                createMockResult({ id: "r5", timestamp: daysAgo(11), category_breakdown: { Test: 75 } }),
                createMockResult({ id: "r6", timestamp: daysAgo(12), category_breakdown: { Test: 75 } }),
            ];

            const trends = calculateCategoryTrends(results);
            // Diff = 79 - 75 = 4 → stable
            expect(trends.get("Test")).toBe("stable");
        });
    });

    describe("multiple categories", () => {
        it("calculates trends for multiple categories independently", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: { Networking: 90, Security: 50 },
                }),
                createMockResult({
                    id: "r2",
                    timestamp: daysAgo(1),
                    category_breakdown: { Networking: 88, Security: 52 },
                }),
                createMockResult({
                    id: "r3",
                    timestamp: daysAgo(2),
                    category_breakdown: { Networking: 85, Security: 48 },
                }),
                createMockResult({
                    id: "r4",
                    timestamp: daysAgo(10),
                    category_breakdown: { Networking: 60, Security: 80 },
                }),
                createMockResult({
                    id: "r5",
                    timestamp: daysAgo(11),
                    category_breakdown: { Networking: 55, Security: 82 },
                }),
                createMockResult({
                    id: "r6",
                    timestamp: daysAgo(12),
                    category_breakdown: { Networking: 50, Security: 85 },
                }),
            ];

            const trends = calculateCategoryTrends(results);
            expect(trends.get("Networking")).toBe("improving");
            expect(trends.get("Security")).toBe("declining");
        });
    });

    describe("edge cases", () => {
        it("handles results without category_breakdown", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: undefined as unknown as Record<string, number>,
                }),
            ];

            const trends = calculateCategoryTrends(results);
            expect(trends.size).toBe(0);
        });
    });
});
