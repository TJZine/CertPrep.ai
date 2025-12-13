import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCategoryTrends } from "@/hooks/useCategoryTrends";
import { createMockResult, daysAgo } from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";

describe("useCategoryTrends", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Set to a Wednesday to ensure stable week calculations
        vi.setSystemTime(new Date(2024, 11, 11, 12, 0, 0)); // Dec 11, 2024
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("empty data", () => {
        it("returns empty arrays when no results", () => {
            const { result } = renderHook(() => useCategoryTrends([]));

            expect(result.current.trendData).toEqual([]);
            expect(result.current.categories).toEqual([]);
        });

        it("returns empty arrays when results have no category_breakdown", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    category_breakdown: {},
                }),
            ];

            const { result } = renderHook(() => useCategoryTrends(results));

            expect(result.current.trendData).toEqual([]);
            expect(result.current.categories).toEqual([]);
        });
    });

    describe("single week data", () => {
        it("returns one data point for results in the same week", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: { Networking: 80, Security: 70 },
                }),
                createMockResult({
                    id: "r2",
                    timestamp: daysAgo(1),
                    category_breakdown: { Networking: 90, Security: 60 },
                }),
            ];

            const { result } = renderHook(() => useCategoryTrends(results));

            expect(result.current.trendData).toHaveLength(1);
            expect(result.current.categories).toContain("Networking");
            expect(result.current.categories).toContain("Security");
        });

        it("averages scores within the same week", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: { Networking: 80 },
                }),
                createMockResult({
                    id: "r2",
                    timestamp: daysAgo(1),
                    category_breakdown: { Networking: 60 },
                }),
            ];

            const { result } = renderHook(() => useCategoryTrends(results));

            // Average of 80 and 60 = 70
            expect(result.current.trendData[0]?.["Networking"]).toBe(70);
        });
    });

    describe("multi-week data", () => {
        it("returns multiple data points for results across weeks", () => {
            const results: Result[] = [
                // This week
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: { Networking: 90 },
                }),
                // Two weeks ago
                createMockResult({
                    id: "r2",
                    timestamp: daysAgo(14),
                    category_breakdown: { Networking: 70 },
                }),
            ];

            const { result } = renderHook(() => useCategoryTrends(results));

            expect(result.current.trendData.length).toBeGreaterThanOrEqual(2);
        });

        it("orders data chronologically (oldest first)", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: { Networking: 90 },
                }),
                createMockResult({
                    id: "r2",
                    timestamp: daysAgo(21),
                    category_breakdown: { Networking: 60 },
                }),
            ];

            const { result } = renderHook(() => useCategoryTrends(results));

            // First point should have lower score (older), last point higher (recent)
            const firstPoint = result.current.trendData[0];
            const lastPoint =
                result.current.trendData[result.current.trendData.length - 1];

            expect(firstPoint?.["Networking"]).toBe(60);
            expect(lastPoint?.["Networking"]).toBe(90);
        });
    });

    describe("category sorting", () => {
        it("sorts categories by average score (weakest first)", () => {
            const results: Result[] = [
                createMockResult({
                    id: "r1",
                    timestamp: daysAgo(0),
                    category_breakdown: { Strong: 95, Weak: 40, Medium: 70 },
                }),
            ];

            const { result } = renderHook(() => useCategoryTrends(results));

            // Weakest first: Weak (40) < Medium (70) < Strong (95)
            expect(result.current.categories[0]).toBe("Weak");
            expect(result.current.categories[1]).toBe("Medium");
            expect(result.current.categories[2]).toBe("Strong");
        });
    });

    describe("stability", () => {
        it("maintains referential equality when props remain same", () => {
            const results = [
                createMockResult({
                    id: "r1",
                    category_breakdown: { Networking: 80 },
                }),
            ];

            const { result, rerender } = renderHook(
                ({ r }) => useCategoryTrends(r),
                { initialProps: { r: results } }
            );

            const firstResult = result.current;
            rerender({ r: results });
            const secondResult = result.current;

            expect(secondResult).toBe(firstResult);
        });
    });
});
