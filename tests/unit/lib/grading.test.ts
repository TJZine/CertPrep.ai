
import { describe, it, expect, vi } from "vitest";
import { evaluateAnswer } from "@/lib/grading";
import { hashAnswer } from "@/lib/utils";
import type { Question } from "@/types/quiz";

// Mock hashAnswer for deterministic testing
vi.mock("@/lib/utils", () => ({
    hashAnswer: vi.fn(async (input: string) => `hashed_${input}`),
}));

describe("Grading Logic (Pure)", () => {
    const mockQuestion: Question = {
        id: "q1",
        question: "Test Question?",
        options: { a: "A", b: "B", c: "C", d: "D" },
        category: "Test Category",
        explanation: "Simple explanation",
        correct_answer: "A", // Legacy
        correct_answer_hash: "hashed_A", // Preferred
    };

    it("should mark answer as correct using hash comparison", async () => {
        const result = await evaluateAnswer(mockQuestion, "A");
        expect(result.isCorrect).toBe(true);
        expect(result.category).toBe("Test Category");
        expect(hashAnswer).toHaveBeenCalledWith("A");
    });

    it("should mark answer as incorrect using hash comparison", async () => {
        const result = await evaluateAnswer(mockQuestion, "B");
        expect(result.isCorrect).toBe(false);
    });

    it("should handle missing correct_answer_hash by falling back to plaintext", async () => {
        const legacyQuestion = { ...mockQuestion, correct_answer_hash: undefined };
        const result = await evaluateAnswer(legacyQuestion, "A");
        expect(result.isCorrect).toBe(true);
    });

    it("should handle null/undefined user answer", async () => {
        const result1 = await evaluateAnswer(mockQuestion, null);
        expect(result1.isCorrect).toBe(false);

        const result2 = await evaluateAnswer(mockQuestion, undefined);
        expect(result2.isCorrect).toBe(false);
    });

    it("should default category to 'Uncategorized' if missing", async () => {
        const noCatQuestion = { ...mockQuestion, category: undefined };
        // @ts-expect-error - testing runtime behavior for optional field
        const result = await evaluateAnswer(noCatQuestion, "A");
        expect(result.category).toBe("Uncategorized");
    });
});
