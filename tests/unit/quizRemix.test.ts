import { describe, it, expect } from "vitest";
import { remixQuestion, remixQuiz, translateToOriginalKey, buildAnswersRecord } from "@/lib/quiz-remix";
import { hashAnswer } from "@/lib/utils";
import type { Question, Quiz } from "@/types/quiz";

describe("quiz-remix", () => {
    const mockQuestion: Question = {
        id: "q1",
        question: "What is 1+1?",
        options: {
            A: "1",
            B: "2",
            C: "3",
            D: "4",
        },
        correct_answer: "B",
        correct_answer_hash: "", // Will be set in test
        explanation: "It's 2.",
        category: "Math",
    };

    const mockQuiz: Quiz = {
        id: "quiz1",
        title: "Basic Math",
        description: "Simple math quiz",
        questions: [
            { ...mockQuestion },
            {
                ...mockQuestion,
                id: "q2",
                question: "What is 2+2?",
                options: { A: "3", B: "4", C: "5" },
                correct_answer: "B",
            },
        ],
        tags: ["math"],
        user_id: "user1",
        created_at: Date.now(),
        updated_at: Date.now(),
        version: 1,
    };

    describe("remixQuestion", () => {
        it("should shuffle options and update correct answer", async () => {
            const q = { ...mockQuestion };
            q.correct_answer_hash = await hashAnswer("B");

            const result = await remixQuestion(q);

            // Same number of options
            expect(Object.keys(result.question.options)).toHaveLength(4);

            // All original options are present
            const originalOptionsValues = Object.values(q.options).sort();
            const remixedOptionsValues = Object.values(result.question.options).sort();
            expect(remixedOptionsValues).toEqual(originalOptionsValues);

            // Correct answer key updated properly
            const newCorrectKey = result.question.correct_answer!;
            expect(result.question.options[newCorrectKey]).toBe("2");

            // Hash matches new key
            const expectedHash = await hashAnswer(newCorrectKey);
            expect(result.question.correct_answer_hash).toBe(expectedHash);

            // Key mapping is correct
            for (const [newKey, oldKey] of Object.entries(result.keyMapping)) {
                expect(result.question.options[newKey]).toBe(q.options[oldKey]);
            }
        });

        it("should handle questions without correct answers", async () => {
            const q = { ...mockQuestion, correct_answer: undefined, correct_answer_hash: undefined };
            const result = await remixQuestion(q);

            expect(result.question.correct_answer).toBeUndefined();
            expect(result.question.correct_answer_hash).toBeUndefined();
        });

        it("should handle hash-only mode (correct_answer undefined)", async () => {
            // Simulate hash-only mode where correct_answer is not set but hash is
            const originalHash = await hashAnswer("B"); // B is the correct answer
            const q = { ...mockQuestion, correct_answer: undefined, correct_answer_hash: originalHash };

            const result = await remixQuestion(q);

            // Should resolve correct answer from hash
            const newCorrectKey = result.question.correct_answer!;
            expect(newCorrectKey).toBeDefined();

            // The option at newCorrectKey should be "2" (original B's value)
            expect(result.question.options[newCorrectKey]).toBe("2");

            // Hash should be updated to match new key
            const expectedHash = await hashAnswer(newCorrectKey);
            expect(result.question.correct_answer_hash).toBe(expectedHash);
        });
    });

    describe("remixQuiz", () => {
        it("should shuffle questions and their options", async () => {
            const qz = { ...mockQuiz };
            qz.questions[0]!.correct_answer_hash = await hashAnswer("B");
            qz.questions[1]!.correct_answer_hash = await hashAnswer("B");

            const result = await remixQuiz(qz);

            expect(result.quiz.questions).toHaveLength(2);
            expect(result.keyMappings.size).toBe(2);

            // Verify each question in remixed quiz exists in original
            const originalIds = qz.questions.map(q => q.id).sort();
            const remixedIds = result.quiz.questions.map(q => q.id).sort();
            expect(remixedIds).toEqual(originalIds);

            // Verify mapping exists for each question
            result.quiz.questions.forEach(q => {
                expect(result.keyMappings.has(q.id)).toBe(true);
            });
        });
    });

    describe("translateToOriginalKey", () => {
        it("should translate remixed key to original key", () => {
            const mapping = { A: "C", B: "A", C: "D", D: "B" };
            expect(translateToOriginalKey("A", mapping)).toBe("C");
            expect(translateToOriginalKey("D", mapping)).toBe("B");
        });

        it("should return same key if no mapping provided", () => {
            expect(translateToOriginalKey("A", undefined)).toBe("A");
        });

        it("should return same key if key not in mapping", () => {
            const mapping = { A: "C" };
            expect(translateToOriginalKey("B", mapping)).toBe("B");
        });
    });

    describe("buildAnswersRecord", () => {
        it("should translate all answers using key mappings", () => {
            const answers = new Map([
                ["q1", { selectedAnswer: "A" }],
                ["q2", { selectedAnswer: "B" }],
            ]);
            const keyMappings = new Map<string, Record<string, string>>([
                ["q1", { A: "C", B: "A", C: "D", D: "B" }],
                ["q2", { A: "B", B: "D", C: "A" }],
            ]);

            const result = buildAnswersRecord(answers, keyMappings);

            expect(result).toEqual({
                q1: "C", // A maps to C
                q2: "D", // B maps to D
            });
        });

        it("should return original keys when no mappings provided", () => {
            const answers = new Map([
                ["q1", { selectedAnswer: "A" }],
                ["q2", { selectedAnswer: "B" }],
            ]);

            const result = buildAnswersRecord(answers, null);

            expect(result).toEqual({
                q1: "A",
                q2: "B",
            });
        });

        it("should handle mixed mapped and unmapped questions", () => {
            const answers = new Map([
                ["q1", { selectedAnswer: "A" }],
                ["q2", { selectedAnswer: "B" }],
            ]);
            const keyMappings = new Map([
                ["q1", { A: "D", B: "C" }],
                // q2 has no mapping
            ]);

            const result = buildAnswersRecord(answers, keyMappings);

            expect(result).toEqual({
                q1: "D", // A maps to D
                q2: "B", // No mapping, original key
            });
        });

        it("should handle empty answers map", () => {
            const answers = new Map<string, { selectedAnswer: string }>();
            const keyMappings = new Map([["q1", { A: "B" }]]);

            const result = buildAnswersRecord(answers, keyMappings);

            expect(result).toEqual({});
        });
    });
});
