/**
 * Category weighting utilities for analytics calculations.
 *
 * Extracted from analytics page.tsx to enable unit testing of
 * weighted average calculations for category performance.
 */

import type { Result } from "@/types/result";

export interface WeightedCategory {
    category: string;
    avgScore: number;
}

/**
 * Calculate weighted average scores per category from quiz results.
 *
 * Each session's category score is weighted by the number of questions
 * in that category (from `computed_category_scores`), so larger sample
 * sizes have more influence. This approximates pooled-totals behavior
 * while supporting date filtering.
 *
 * @param results - Array of quiz results to analyze
 * @param maxCategories - Maximum categories to return (default: 5)
 * @returns Array of categories sorted ascending by avgScore (weakest first)
 *
 * @example
 * ```ts
 * const results = [
 *   { category_breakdown: { "Math": 80 }, computed_category_scores: { "Math": { total: 10 } } },
 *   { category_breakdown: { "Math": 90 }, computed_category_scores: { "Math": { total: 20 } } },
 * ];
 * calculateWeakestCategories(results);
 * // Returns [{ category: "Math", avgScore: 87 }]
 * // Calculation: (80*10 + 90*20) / (10+20) = 2600/30 ≈ 87
 * ```
 */
export function calculateWeakestCategories(
    results: Result[],
    maxCategories = 5
): WeightedCategory[] {
    const categorySums = new Map<
        string,
        { weightedSum: number; totalWeight: number }
    >();

    results.forEach((r) => {
        if (!r.category_breakdown) return;
        Object.entries(r.category_breakdown).forEach(([cat, score]) => {
            // Use question count as weight if available, otherwise default to 1
            const weight = r.computed_category_scores?.[cat]?.total ?? 1;
            const current = categorySums.get(cat) || {
                weightedSum: 0,
                totalWeight: 0,
            };
            current.weightedSum += score * weight;
            current.totalWeight += weight;
            categorySums.set(cat, current);
        });
    });

    return Array.from(categorySums.entries())
        .map(([category, { weightedSum, totalWeight }]) => ({
            category,
            avgScore: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
        }))
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, maxCategories);
}
