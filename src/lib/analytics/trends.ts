import type { Result } from "@/types/result";

export type TrendDirection = "improving" | "declining" | "stable";

/**
 * Calculates category trends by comparing recent vs prior performance.
 * Logic:
 * - Requires at least 6 attempts to establish a trend.
 * - Sorts by timestamp descending (newest first).
 * - Compares average of last 3 vs prior 3.
 * - Improvement >= 5 points -> "improving"
 * - Decline <= -5 points -> "declining"
 * - Otherwise -> "stable"
 */
export function calculateCategoryTrends(
    results: Result[],
): Map<string, TrendDirection> {
    const trends = new Map<string, TrendDirection>();

    if (results.length < 2) return trends;

    // Group results by category with timestamps
    const categoryResults = new Map<
        string,
        Array<{ score: number; timestamp: number }>
    >();

    for (const result of results) {
        if (!result.category_breakdown) continue;

        for (const [category, score] of Object.entries(result.category_breakdown)) {
            const existing = categoryResults.get(category) || [];
            existing.push({ score, timestamp: result.timestamp });
            categoryResults.set(category, existing);
        }
    }

    // Calculate trend for each category
    for (const [category, scores] of categoryResults) {
        if (scores.length < 6) {
            trends.set(category, "stable");
            continue;
        }

        // Sort by timestamp descending (newest first)
        scores.sort((a, b) => b.timestamp - a.timestamp);

        const last3 = scores.slice(0, 3);
        const prior3 = scores.slice(3, 6);

        const last3Avg = last3.reduce((sum, s) => sum + s.score, 0) / last3.length;
        const prior3Avg =
            prior3.reduce((sum, s) => sum + s.score, 0) / prior3.length;

        const diff = last3Avg - prior3Avg;

        if (diff >= 5) {
            trends.set(category, "improving");
        } else if (diff <= -5) {
            trends.set(category, "declining");
        } else {
            trends.set(category, "stable");
        }
    }

    return trends;
}
