import { describe, it, expect } from "vitest";
import { generateUUID, hashAnswer } from "@/lib/core/crypto";

describe("crypto utils", () => {
    describe("generateUUID", () => {
        it("should return a UUID string", () => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const uuid1 = generateUUID();
            const uuid2 = generateUUID();
            expect(uuid1).toMatch(uuidRegex);
            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe("hashAnswer", () => {
        it("should return a stable hex string for a given input", async () => {
            const input = "test answer";
            const hash1 = await hashAnswer(input);
            const hash2 = await hashAnswer(input);
            expect(hash1).toBe(hash2);
            expect(typeof hash1).toBe("string");
            expect(hash1).toMatch(/^[0-9a-f]{64}$/);
        });

        it("should return different hashes for different inputs", async () => {
            const hash1 = await hashAnswer("answer A");
            const hash2 = await hashAnswer("answer B");
            expect(hash1).not.toBe(hash2);
        });
    });
});
