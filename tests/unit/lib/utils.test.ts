import { describe, it, expect } from "vitest";
import {
    cn,
    generateUUID,
    formatTime,
    formatDate,
    calculatePercentage,
    hashAnswer
} from "@/lib/utils";

describe("utils", () => {
    describe("cn", () => {
        it("should merge basic class names", () => {
            expect(cn("class1", "class2")).toBe("class1 class2");
        });

        it("should handle conditional class names", () => {
            expect(cn("class1", true && "class2", false && "class3")).toBe("class1 class2");
        });

        it("should merge tailwind classes properly overriding when needed", () => {
            expect(cn("p-4 bg-red-500", "p-8")).toBe("bg-red-500 p-8");
            expect(cn("text-sm", "text-lg")).toBe("text-lg");
        });
    });

    describe("generateUUID", () => {
        it("should return a UUID string", () => {
            // Basic validation of UUID v4 format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            const uuid1 = generateUUID();
            const uuid2 = generateUUID();

            expect(uuid1).toMatch(uuidRegex);
            expect(uuid1).not.toBe(uuid2); // Should be unique
        });
    });

    describe("formatTime", () => {
        it("should format less than a minute correctly", () => {
            expect(formatTime(45)).toBe("00:45");
            expect(formatTime(9)).toBe("00:09");
        });

        it("should format minutes and seconds correctly", () => {
            expect(formatTime(90)).toBe("01:30");
            expect(formatTime(600)).toBe("10:00");
            expect(formatTime(3605)).toBe("60:05");
        });
    });

    describe("formatDate", () => {
        it("should format timestamp to locale string", () => {
            // Use a fixed timestamp for predictable testing
            const timestamp = new Date("2023-10-24T12:00:00Z").getTime();

            // The exact string depends on the runtime timezone, so we just verify it 
            // returns a non-empty string that contains the year
            const result = formatDate(timestamp);
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain("2023");
        });
    });

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

    describe("hashAnswer", () => {
        it("should return a stable hex string for a given input", async () => {
            const input = "test answer";
            const hash1 = await hashAnswer(input);
            const hash2 = await hashAnswer(input);

            expect(hash1).toBe(hash2);
            expect(typeof hash1).toBe("string");
            expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 is 64 hex chars
        });

        it("should return different hashes for different inputs", async () => {
            const hash1 = await hashAnswer("answer A");
            const hash2 = await hashAnswer("answer B");

            expect(hash1).not.toBe(hash2);
        });
    });
});
