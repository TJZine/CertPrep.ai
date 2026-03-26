import { describe, it, expect } from "vitest";
import { calculatePercentage } from "@/lib/utils/math";

describe("math utils", () => {
    describe("calculatePercentage", () => {
        it("should calculate simple percentages", () => {
            expect(calculatePercentage(5, 10)).toBe(50);
            expect(calculatePercentage(10, 10)).toBe(100);
            expect(calculatePercentage(0, 10)).toBe(0);
        });

        it("should round to nearest integer", () => {
            expect(calculatePercentage(1, 3)).toBe(33);
            expect(calculatePercentage(2, 3)).toBe(67);
            expect(calculatePercentage(1, 8)).toBe(13); // 12.5 -> 13
        });

        it("should return 0 when total is 0 to avoid NaN", () => {
            expect(calculatePercentage(0, 0)).toBe(0);
            expect(calculatePercentage(5, 0)).toBe(0);
        });
    });
});
