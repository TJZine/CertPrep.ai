import { describe, it, expect } from "vitest";
import { calculateReadiness } from "@/hooks/useAdvancedAnalytics";
import { createMockResult, createMockQuiz, createMockQuestion } from "../../fixtures/analyticsTestData";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";

describe("calculateReadiness", () => {
    describe("score calculation", () => {
        it("returns score 0 and low confidence for empty results", () => {
            const result = calculateReadiness([], []);
            expect(result.score).toBe(0);
            expect(result.confidence).toBe("low");
            expect(result.categoryReadiness.size).toBe(0);
        });

        it("calculates perfect score of 100 when all categories are 100%", () => {
            const quizzes: Quiz[] = [
                createMockQuiz({
                    id: "quiz-1",
                    questions: [
                        createMockQuestion({ category: "Networking" }),
                        createMockQuestion({ category: "Security" }),
                    ],
                }),
            ];
            const results: Result[] = [
                createMockResult({
                    quiz_id: "quiz-1",
                    category_breakdown: { Networking: 100, Security: 100 },
                }),
            ];

            const result = calculateReadiness(results, quizzes);
            expect(result.score).toBe(100);
            expect(result.categoryReadiness.get("Networking")).toBe(100);
            expect(result.categoryReadiness.get("Security")).toBe(100);
        });

        it("calculates weighted average for mixed scores", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = [
                createMockResult({
                    quiz_id: "quiz-1",
                    category_breakdown: { Networking: 80, Security: 60 },
                }),
                createMockResult({
                    quiz_id: "quiz-1",
                    category_breakdown: { Networking: 90, Security: 70 },
                }),
            ];

            const result = calculateReadiness(results, quizzes);
            // Networking: (80 + 90) / 2 = 85 (2 attempts)
            // Security: (60 + 70) / 2 = 65 (2 attempts)
            // Weighted avg: (85*2 + 65*2) / 4 = 75
            expect(result.score).toBe(75);
            expect(result.categoryReadiness.get("Networking")).toBe(85);
            expect(result.categoryReadiness.get("Security")).toBe(65);
        });

        it("handles single category correctly", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = [
                createMockResult({
                    quiz_id: "quiz-1",
                    category_breakdown: { Networking: 75 },
                }),
            ];

            const result = calculateReadiness(results, quizzes);
            expect(result.score).toBe(75);
            expect(result.categoryReadiness.size).toBe(1);
        });

        it("ignores results without matching quiz", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = [
                createMockResult({
                    quiz_id: "non-existent-quiz",
                    category_breakdown: { Networking: 100 },
                }),
            ];

            const result = calculateReadiness(results, quizzes);
            expect(result.score).toBe(0);
        });

        it("ignores results without category_breakdown", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = [
                createMockResult({
                    quiz_id: "quiz-1",
                    category_breakdown: undefined as unknown as Record<string, number>,
                }),
            ];

            const result = calculateReadiness(results, quizzes);
            expect(result.score).toBe(0);
        });
    });

    describe("confidence levels", () => {
        it("returns low confidence for < 5 results", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = Array.from({ length: 4 }, (_, i) =>
                createMockResult({
                    id: `r${i}`,
                    quiz_id: "quiz-1",
                    category_breakdown: { General: 80 },
                }),
            );

            const result = calculateReadiness(results, quizzes);
            expect(result.confidence).toBe("low");
        });

        it("returns medium confidence for 5-9 results", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = Array.from({ length: 5 }, (_, i) =>
                createMockResult({
                    id: `r${i}`,
                    quiz_id: "quiz-1",
                    category_breakdown: { General: 80 },
                }),
            );

            const result = calculateReadiness(results, quizzes);
            expect(result.confidence).toBe("medium");
        });

        it("returns high confidence for >= 10 results", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = Array.from({ length: 10 }, (_, i) =>
                createMockResult({
                    id: `r${i}`,
                    quiz_id: "quiz-1",
                    category_breakdown: { General: 80 },
                }),
            );

            const result = calculateReadiness(results, quizzes);
            expect(result.confidence).toBe("high");
        });

        it("returns high confidence for 15 results", () => {
            const quizzes: Quiz[] = [createMockQuiz({ id: "quiz-1" })];
            const results: Result[] = Array.from({ length: 15 }, (_, i) =>
                createMockResult({
                    id: `r${i}`,
                    quiz_id: "quiz-1",
                    category_breakdown: { General: 80 },
                }),
            );

            const result = calculateReadiness(results, quizzes);
            expect(result.confidence).toBe("high");
        });
    });
});
