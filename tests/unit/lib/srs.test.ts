import { describe, it, expect } from "vitest";
import {
    BOX_INTERVALS,
    calculateNextReview,
    promoteBox,
    daysUntilReview,
    isDue,
} from "@/lib/srs";

describe("SRS Leitner Algorithm", () => {
    describe("BOX_INTERVALS", () => {
        it("should have correct intervals for each box", () => {
            expect(BOX_INTERVALS[1]).toBe(1);
            expect(BOX_INTERVALS[2]).toBe(3);
            expect(BOX_INTERVALS[3]).toBe(7);
            expect(BOX_INTERVALS[4]).toBe(14);
            expect(BOX_INTERVALS[5]).toBe(30);
        });
    });

    describe("promoteBox", () => {
        it("should move to next box on Good (3) rating", () => {
            expect(promoteBox(1, 3)).toBe(2);
            expect(promoteBox(2, 3)).toBe(3);
            expect(promoteBox(3, 3)).toBe(4);
            expect(promoteBox(4, 3)).toBe(5);
        });

        it("should stay at box 5 when already mastered with Good rating", () => {
            expect(promoteBox(5, 3)).toBe(5);
        });

        it("should stay in current box on Hard (2) rating", () => {
            expect(promoteBox(1, 2)).toBe(1);
            expect(promoteBox(2, 2)).toBe(2);
            expect(promoteBox(3, 2)).toBe(3);
            expect(promoteBox(4, 2)).toBe(4);
            expect(promoteBox(5, 2)).toBe(5);
        });

        it("should return to box 1 on Again (1) rating", () => {
            expect(promoteBox(1, 1)).toBe(1);
            expect(promoteBox(2, 1)).toBe(1);
            expect(promoteBox(3, 1)).toBe(1);
            expect(promoteBox(4, 1)).toBe(1);
            expect(promoteBox(5, 1)).toBe(1);
        });
    });

    describe("calculateNextReview", () => {
        const fixedNow = new Date("2025-01-01T00:00:00Z").getTime();
        const MS_PER_DAY = 24 * 60 * 60 * 1000;

        it("should calculate correct next review for box 2 (3 days interval)", () => {
            // Box 2 has 3 day interval
            const nextReview = calculateNextReview(2, fixedNow);
            expect(nextReview).toBe(fixedNow + 3 * MS_PER_DAY);
        });

        it("should calculate correct next review for box 1 (1 day interval)", () => {
            // Box 1 has 1 day interval
            const nextReview = calculateNextReview(1, fixedNow);
            expect(nextReview).toBe(fixedNow + 1 * MS_PER_DAY);
        });

        it("should calculate correct next review for box 5 (30 days interval)", () => {
            // Box 5 has 30 day interval
            const nextReview = calculateNextReview(5, fixedNow);
            expect(nextReview).toBe(fixedNow + 30 * MS_PER_DAY);
        });
    });

    describe("daysUntilReview", () => {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const fixedNow = new Date("2025-01-01T00:00:00Z").getTime();

        it("should return positive days for future review", () => {
            const nextReview = fixedNow + 3 * MS_PER_DAY;
            expect(daysUntilReview(nextReview, fixedNow)).toBe(3);
        });

        it("should return 0 when exactly due", () => {
            expect(daysUntilReview(fixedNow, fixedNow)).toBe(0);
        });

        it("should return negative days when overdue", () => {
            const pastReview = fixedNow - 2 * MS_PER_DAY;
            expect(daysUntilReview(pastReview, fixedNow)).toBe(-2);
        });
    });

    describe("isDue", () => {
        const fixedNow = new Date("2025-01-01T00:00:00Z").getTime();

        it("should return true when nextReview is in the past", () => {
            expect(isDue(fixedNow - 1000, fixedNow)).toBe(true);
        });

        it("should return true when nextReview is exactly now", () => {
            expect(isDue(fixedNow, fixedNow)).toBe(true);
        });

        it("should return false when nextReview is in the future", () => {
            expect(isDue(fixedNow + 1000, fixedNow)).toBe(false);
        });
    });
});
