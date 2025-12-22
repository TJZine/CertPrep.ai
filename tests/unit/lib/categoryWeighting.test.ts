import { describe, it, expect } from "vitest";
import {
    calculateWeakestCategories,
} from "@/lib/analytics/categoryWeighting";
import type { Result } from "@/types/result";

/**
 * Helper to create minimal Result objects for testing.
 * Uses Partial<Result> internally to allow omitting optional fields.
 */
function createResult(
    categoryBreakdown: Record<string, number>,
    computedCategoryScores?: Record<string, { correct: number; total: number }>
): Result {
    return {
        id: `test-${Date.now()}-${Math.random()}`,
        quiz_id: "test-quiz",
        user_id: "test-user",
        score: 80,
        mode: "zen",
        answers: {},
        flagged_questions: [],
        time_taken_seconds: 100,
        timestamp: Date.now(),
        category_breakdown: categoryBreakdown,
        computed_category_scores: computedCategoryScores,
    };
}

describe("calculateWeakestCategories", () => {
    describe("weighted average formula", () => {
        it("calculates weighted average = sum(score*weight)/totalWeight", () => {
            // Math: 80% with 10 questions, 90% with 20 questions
            // Expected: (80*10 + 90*20) / 30 = (800 + 1800) / 30 = 86.67 ≈ 87
            const results: Result[] = [
                createResult({ Math: 80 }, { Math: { correct: 8, total: 10 } }),
                createResult({ Math: 90 }, { Math: { correct: 18, total: 20 } }),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest).toHaveLength(1);
            expect(weakest[0]?.category).toBe("Math");
            expect(weakest[0]?.avgScore).toBe(87);
        });

        it("weights larger sessions more heavily", () => {
            // Science: 50% with 2 questions, 100% with 8 questions
            // Expected: (50*2 + 100*8) / 10 = (100 + 800) / 10 = 90
            const results: Result[] = [
                createResult(
                    { Science: 50 },
                    { Science: { correct: 1, total: 2 } }
                ),
                createResult(
                    { Science: 100 },
                    { Science: { correct: 8, total: 8 } }
                ),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.avgScore).toBe(90);
        });
    });

    describe("missing computed_category_scores fallback", () => {
        it("falls back to weight=1 when computed_category_scores is missing", () => {
            // Two results with no weights - should be simple average
            const results: Result[] = [
                createResult({ History: 60 }, undefined),
                createResult({ History: 80 }, undefined),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.category).toBe("History");
            // Simple average: (60 + 80) / 2 = 70
            expect(weakest[0]?.avgScore).toBe(70);
        });

        it("falls back to weight=1 when category is missing from computed_category_scores", () => {
            // Result has computed_category_scores but not for this category
            const results: Result[] = [
                createResult(
                    { Art: 70 },
                    { OtherCategory: { correct: 5, total: 10 } }
                ),
                createResult({ Art: 90 }, undefined),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.category).toBe("Art");
            // Simple average with weight=1 each: (70 + 90) / 2 = 80
            expect(weakest[0]?.avgScore).toBe(80);
        });

        it("handles mixed weights - some present, some missing", () => {
            // First result has weight, second doesn't
            // Physics: 60% with 10 questions + 80% with weight=1
            // Expected: (60*10 + 80*1) / 11 = 680 / 11 ≈ 62
            const results: Result[] = [
                createResult(
                    { Physics: 60 },
                    { Physics: { correct: 6, total: 10 } }
                ),
                createResult({ Physics: 80 }, undefined),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.category).toBe("Physics");
            expect(weakest[0]?.avgScore).toBe(62);
        });
    });

    describe("empty results handling", () => {
        it("returns empty array for empty results", () => {
            const weakest = calculateWeakestCategories([]);

            expect(weakest).toEqual([]);
        });

        it("returns empty array when results have no category_breakdown", () => {
            // Intentionally testing undefined category_breakdown edge case
            const results = [
                {
                    ...createResult({}, undefined),
                    category_breakdown: undefined,
                },
            ] as unknown as Result[];

            const weakest = calculateWeakestCategories(results);

            expect(weakest).toEqual([]);
        });

        it("skips results with null category_breakdown", () => {
            // Intentionally testing mixed valid/undefined category_breakdown
            const results = [
                createResult({ Valid: 80 }, undefined),
                {
                    ...createResult({}, undefined),
                    category_breakdown: undefined,
                },
            ] as unknown as Result[];

            const weakest = calculateWeakestCategories(results);

            expect(weakest).toHaveLength(1);
            expect(weakest[0]?.category).toBe("Valid");
        });
    });

    describe("sorting and slicing", () => {
        it("sorts categories ascending by avgScore (weakest first)", () => {
            const results: Result[] = [
                createResult({ High: 90, Medium: 70, Low: 50 }, undefined),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest.map((w) => w.category)).toEqual([
                "Low",
                "Medium",
                "High",
            ]);
        });

        it("returns only the lowest 5 categories by default", () => {
            const results: Result[] = [
                createResult(
                    {
                        Cat1: 10,
                        Cat2: 20,
                        Cat3: 30,
                        Cat4: 40,
                        Cat5: 50,
                        Cat6: 60,
                        Cat7: 70,
                    },
                    undefined
                ),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest).toHaveLength(5);
            expect(weakest.map((w) => w.category)).toEqual([
                "Cat1",
                "Cat2",
                "Cat3",
                "Cat4",
                "Cat5",
            ]);
        });

        it("respects custom maxCategories parameter", () => {
            const results: Result[] = [
                createResult({ A: 10, B: 20, C: 30, D: 40 }, undefined),
            ];

            const weakest = calculateWeakestCategories(results, 2);

            expect(weakest).toHaveLength(2);
            expect(weakest.map((w) => w.category)).toEqual(["A", "B"]);
        });

        it("returns all categories when fewer than maxCategories exist", () => {
            const results: Result[] = [
                createResult({ Only: 50, Two: 60 }, undefined),
            ];

            const weakest = calculateWeakestCategories(results, 5);

            expect(weakest).toHaveLength(2);
        });
    });

    describe("edge cases", () => {
        it("handles zero scores correctly", () => {
            const results: Result[] = [
                createResult({ Failed: 0 }, { Failed: { correct: 0, total: 5 } }),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.avgScore).toBe(0);
        });

        it("handles 100% scores correctly", () => {
            const results: Result[] = [
                createResult(
                    { Perfect: 100 },
                    { Perfect: { correct: 10, total: 10 } }
                ),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.avgScore).toBe(100);
        });

        it("handles single result with multiple categories", () => {
            const results: Result[] = [
                createResult(
                    { A: 70, B: 80, C: 90 },
                    {
                        A: { correct: 7, total: 10 },
                        B: { correct: 8, total: 10 },
                        C: { correct: 9, total: 10 },
                    }
                ),
            ];

            const weakest = calculateWeakestCategories(results);

            expect(weakest).toHaveLength(3);
            expect(weakest[0]?.category).toBe("A");
            expect(weakest[0]?.avgScore).toBe(70);
        });

        it("aggregates same category across multiple results", () => {
            // Same category in different sessions
            const results: Result[] = [
                createResult({ Math: 60 }, { Math: { correct: 3, total: 5 } }),
                createResult({ Math: 80 }, { Math: { correct: 8, total: 10 } }),
                createResult({ Math: 70 }, { Math: { correct: 7, total: 10 } }),
            ];

            // Expected: (60*5 + 80*10 + 70*10) / 25 = (300 + 800 + 700) / 25 = 72
            const weakest = calculateWeakestCategories(results);

            expect(weakest[0]?.avgScore).toBe(72);
        });
    });
});
