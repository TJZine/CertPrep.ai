import { describe, it, expect } from "vitest";
import {
    validateQuizImport,
    formatValidationErrors,
    QuestionSchema,
    QuizImportSchema
} from "@/validators/quizSchema";

describe("quizSchema validators", () => {
    describe("QuestionSchema", () => {
        const validQuestion = {
            id: "q1",
            category: "TestCategory",
            difficulty: "Easy",
            question: "What is testing?",
            options: { a: "A process", b: "A tool" },
            correct_answer: "a",
            explanation: "Testing validates functionality.",
        };

        it("should accept a valid question structure", () => {
            const result = QuestionSchema.safeParse(validQuestion);
            expect(result.success).toBe(true);
        });

        it("should reject if correct_answer is not in options keys", () => {
            const invalidQ = { ...validQuestion, correct_answer: "c" };
            const result = QuestionSchema.safeParse(invalidQ);
            expect(result.success).toBe(false);
            if (!result.success) {
                const hasSpecificError = result.error.issues.some(
                    issue => issue.message === "Correct answer must match one of the option keys"
                );
                expect(hasSpecificError).toBe(true);
            }
        });

        it("should accept correct_answer_hash if correct_answer is omitted", () => {
            const hashQ = {
                ...validQuestion,
                correct_answer: undefined,
                correct_answer_hash: "hashed_a"
            };

            const result = QuestionSchema.safeParse(hashQ);
            expect(result.success).toBe(true);
        });

        it("should reject if both correct_answer and correct_answer_hash are missing", () => {
            const missingQ = {
                ...validQuestion,
                correct_answer: undefined,
                correct_answer_hash: undefined
            };

            const result = QuestionSchema.safeParse(missingQ);
            expect(result.success).toBe(false);
            if (!result.success) {
                const hasSpecificError = result.error.issues.some(
                    issue => issue.message === "Either correct_answer or correct_answer_hash must be provided"
                );
                expect(hasSpecificError).toBe(true);
            }
        });

        it("should reject if less than 2 options", () => {
            const lessOptionsQ = {
                ...validQuestion,
                options: { a: "Only one" }
            };
            const result = QuestionSchema.safeParse(lessOptionsQ);
            expect(result.success).toBe(false);
        });

        it("should reject if more than 8 options", () => {
            const tooManyOptionsQ = {
                ...validQuestion,
                options: { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6", g: "7", h: "8", i: "9" }
            };
            const result = QuestionSchema.safeParse(tooManyOptionsQ);
            expect(result.success).toBe(false);
        });

        it("should cast number id to string", () => {
            const numIdQ = { ...validQuestion, id: 123 };
            const result = QuestionSchema.safeParse(numIdQ);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe("123");
            }
        });
    });

    describe("QuizImportSchema", () => {
        const validImport = {
            title: "Test Quiz",
            category: "Tech",
            questions: [
                {
                    id: "q1",
                    category: "Tech",
                    question: "Q1",
                    options: { a: "1", b: "2" },
                    correct_answer: "a",
                    explanation: "Exp"
                }
            ]
        };

        it("should parse valid imports and apply defaults", () => {
            const result = QuizImportSchema.safeParse(validImport);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.description).toBe("");
                expect(result.data.tags).toEqual([]);
                expect(result.data.version).toBe(1);
            }
        });

        it("should reject imports with empty questions array", () => {
            const emptyImport = { ...validImport, questions: [] };
            const result = QuizImportSchema.safeParse(emptyImport);
            expect(result.success).toBe(false);
        });
    });

    describe("validateQuizImport & formatValidationErrors", () => {
        it("should return success and data for valid import", () => {
            const validImport = {
                title: "Test Quiz",
                questions: [
                    {
                        id: "q1",
                        category: "Tech",
                        question: "Q1",
                        options: { a: "1", b: "2" },
                        correct_answer: "a",
                        explanation: "Exp"
                    }
                ]
            };

            const result = validateQuizImport(validImport);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.errors).toBeUndefined();
        });

        it("should return false and errors for invalid import", () => {
            const invalidImport = {
                title: "", // Empty title
                questions: [] // Empty questions
            };

            const result = validateQuizImport(invalidImport);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        it("should format validation errors correctly", () => {
            const errors = [
                { path: ["title"], message: "Title is required" },
                { path: ["questions", 0, "correct_answer"], message: "Missing answer" }
            ];

            const formatted = formatValidationErrors(errors);
            expect(formatted).toContain("title: Title is required");
            expect(formatted).toContain("questions.[0].correct_answer: Missing answer");
        });

        it("should return empty string for empty errors array", () => {
            expect(formatValidationErrors([])).toBe("");
        });
    });
});
