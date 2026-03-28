import { describe, it, expect } from "vitest";
import { formatTime, formatDate } from "@/lib/date";

describe("date utils", () => {
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
        it("should format timestamp to a deterministic locale-aware string", () => {
            const timestamp = new Date("2023-10-24T12:00:00Z").getTime();
            const result = formatDate(timestamp);
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
            
            const date = new Date(timestamp);
            expect(result).toContain(date.getFullYear().toString());
        });
    });
});
