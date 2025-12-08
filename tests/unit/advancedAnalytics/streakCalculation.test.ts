import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateStreaks, getDateKey } from "@/hooks/useAdvancedAnalytics";
import { createMockResult, daysAgo } from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";

describe("getDateKey", () => {
    it("returns correct YYYY-MM-DD format", () => {
        // Jan 15, 2024 at noon local time
        const date = new Date(2024, 0, 15, 12, 0, 0);
        const key = getDateKey(date.getTime());
        expect(key).toBe("2024-01-15");
    });

    it("pads single digit months and days", () => {
        const date = new Date(2024, 5, 5, 12, 0, 0); // June 5
        const key = getDateKey(date.getTime());
        expect(key).toBe("2024-06-05");
    });
});

describe("calculateStreaks", () => {
    // Use fake timers to control 'today'
    beforeEach(() => {
        vi.useFakeTimers();
        // Set "today" to a fixed date for predictable testing
        vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15, 2024, noon
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("empty input", () => {
        it("returns zeros and all-false activity for empty results", () => {
            const result = calculateStreaks([]);
            expect(result.current).toBe(0);
            expect(result.longest).toBe(0);
            expect(result.consistency).toBe(0);
            expect(result.last7Days).toEqual([false, false, false, false, false, false, false]);
        });
    });

    describe("current streak calculation", () => {
        it("calculates 3-day streak from today", () => {
            const results: Result[] = [
                createMockResult({ timestamp: daysAgo(0) }), // Today
                createMockResult({ timestamp: daysAgo(1) }), // Yesterday
                createMockResult({ timestamp: daysAgo(2) }), // 2 days ago
            ];

            const result = calculateStreaks(results);
            expect(result.current).toBe(3);
        });

        it("calculates streak starting from yesterday if no activity today", () => {
            const results: Result[] = [
                createMockResult({ timestamp: daysAgo(1) }), // Yesterday
                createMockResult({ timestamp: daysAgo(2) }), // 2 days ago
            ];

            const result = calculateStreaks(results);
            expect(result.current).toBe(2);
        });

        it("returns 1 for activity only today", () => {
            const results: Result[] = [createMockResult({ timestamp: daysAgo(0) })];

            const result = calculateStreaks(results);
            expect(result.current).toBe(1);
        });

        it("returns 0 when current streak is broken", () => {
            // Last activity was 3 days ago
            const results: Result[] = [
                createMockResult({ timestamp: daysAgo(3) }),
                createMockResult({ timestamp: daysAgo(4) }),
            ];

            const result = calculateStreaks(results);
            expect(result.current).toBe(0);
        });

        it("counts multiple activities on same day as 1 day", () => {
            // Three quizzes today - should still be streak of 1
            const todayNoon = daysAgo(0);
            const results: Result[] = [
                createMockResult({ id: "r1", timestamp: todayNoon }),
                createMockResult({ id: "r2", timestamp: todayNoon + 1000 }),
                createMockResult({ id: "r3", timestamp: todayNoon + 2000 }),
            ];

            const result = calculateStreaks(results);
            expect(result.current).toBe(1);
        });
    });

    describe("longest streak calculation", () => {
        it("calculates longest streak correctly", () => {
            const results: Result[] = [
                // Current 2-day streak
                createMockResult({ timestamp: daysAgo(0) }),
                createMockResult({ timestamp: daysAgo(1) }),
                // Gap
                // Longer 4-day streak in the past
                createMockResult({ timestamp: daysAgo(10) }),
                createMockResult({ timestamp: daysAgo(11) }),
                createMockResult({ timestamp: daysAgo(12) }),
                createMockResult({ timestamp: daysAgo(13) }),
            ];

            const result = calculateStreaks(results);
            expect(result.longest).toBe(4);
        });

        it("longest equals current when current is the longest", () => {
            const results: Result[] = [
                createMockResult({ timestamp: daysAgo(0) }),
                createMockResult({ timestamp: daysAgo(1) }),
                createMockResult({ timestamp: daysAgo(2) }),
            ];

            const result = calculateStreaks(results);
            expect(result.longest).toBe(3);
            expect(result.current).toBe(3);
        });
    });

    describe("consistency score (30-day)", () => {
        it("calculates 50% consistency for 15 active days in 30", () => {
            // Create results for 15 of the last 30 days
            const results: Result[] = Array.from({ length: 15 }, (_, i) =>
                createMockResult({ id: `r${i}`, timestamp: daysAgo(i * 2) }),
            );

            const result = calculateStreaks(results);
            expect(result.consistency).toBe(50);
        });

        it("calculates 100% consistency when all 30 days have activity", () => {
            const results: Result[] = Array.from({ length: 30 }, (_, i) =>
                createMockResult({ id: `r${i}`, timestamp: daysAgo(i) }),
            );

            const result = calculateStreaks(results);
            expect(result.consistency).toBe(100);
        });

        it("calculates 0% consistency when no activity in last 30 days", () => {
            const results: Result[] = [createMockResult({ timestamp: daysAgo(35) })];

            const result = calculateStreaks(results);
            expect(result.consistency).toBe(0);
        });
    });

    describe("last7Days activity array", () => {
        it("returns correct boolean array for 7-day activity", () => {
            const results: Result[] = [
                createMockResult({ timestamp: daysAgo(0) }), // Today
                createMockResult({ timestamp: daysAgo(2) }), // 2 days ago
                createMockResult({ timestamp: daysAgo(5) }), // 5 days ago
            ];

            const result = calculateStreaks(results);
            // [today, yesterday, 2 days ago, 3 days ago, 4 days ago, 5 days ago, 6 days ago]
            expect(result.last7Days).toEqual([true, false, true, false, false, true, false]);
        });

        it("returns all true when every day has activity", () => {
            const results: Result[] = Array.from({ length: 7 }, (_, i) =>
                createMockResult({ id: `r${i}`, timestamp: daysAgo(i) }),
            );

            const result = calculateStreaks(results);
            expect(result.last7Days).toEqual([true, true, true, true, true, true, true]);
        });
    });
});
