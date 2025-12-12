"use client";

import { useMemo } from "react";
import type { Result } from "@/types/result";

const WEEKS_TO_TRACK = 8;

export interface CategoryTrendPoint {
    /** Week label (e.g., "Dec 2") */
    week: string;
    /** Dynamic keys for each category's score (0-100) */
    [category: string]: number | string;
}

export interface UseCategoryTrendsResult {
    /** Time-series data with weekly aggregated scores per category */
    trendData: CategoryTrendPoint[];
    /** List of categories found in the data (sorted by avg score, weakest first) */
    categories: string[];
}

/**
 * Returns the ISO week start date (Monday) for a given timestamp.
 */
function getWeekStart(timestamp: number): Date {
    const date = new Date(timestamp);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

/**
 * Formats a date as "Mon D" (e.g., "Dec 2").
 */
function formatWeekLabel(date: Date): string {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

/**
 * Hook that aggregates category performance by week for trend visualization.
 * 
 * Groups results by ISO week and calculates average score per category.
 * Returns the last 8 weeks of data with categories sorted by overall performance.
 *
 * @param results - Array of quiz results with category_breakdown data.
 * @returns Time-series trend data and category list for charting.
 */
export function useCategoryTrends(results: Result[]): UseCategoryTrendsResult {
    return useMemo(() => {
        if (results.length === 0) {
            return { trendData: [], categories: [] };
        }

        // Filter results that have category breakdown data
        const validResults = results.filter(
            (r) => r.category_breakdown && Object.keys(r.category_breakdown).length > 0
        );

        if (validResults.length === 0) {
            return { trendData: [], categories: [] };
        }

        // Group results by week -> category -> scores
        const weeklyData = new Map<
            string,
            { weekStart: Date; categories: Map<string, number[]> }
        >();

        // Track overall category totals for sorting
        const categoryTotals = new Map<string, { sum: number; count: number }>();

        for (const result of validResults) {
            const weekStart = getWeekStart(result.timestamp);
            const weekKey = weekStart.toISOString();

            if (!weeklyData.has(weekKey)) {
                weeklyData.set(weekKey, { weekStart, categories: new Map() });
            }

            const weekEntry = weeklyData.get(weekKey)!;

            for (const [category, score] of Object.entries(result.category_breakdown)) {
                // Add to weekly aggregation
                if (!weekEntry.categories.has(category)) {
                    weekEntry.categories.set(category, []);
                }
                weekEntry.categories.get(category)!.push(score);

                // Track overall category performance for sorting
                if (!categoryTotals.has(category)) {
                    categoryTotals.set(category, { sum: 0, count: 0 });
                }
                const totals = categoryTotals.get(category)!;
                totals.sum += score;
                totals.count += 1;
            }
        }

        // Sort weeks chronologically and limit to last N weeks
        const sortedWeeks = Array.from(weeklyData.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-WEEKS_TO_TRACK);

        if (sortedWeeks.length === 0) {
            return { trendData: [], categories: [] };
        }

        // Sort categories by avg score (weakest first, so they appear first in chart)
        const sortedCategories = Array.from(categoryTotals.entries())
            .map(([category, { sum, count }]) => ({
                category,
                avgScore: Math.round(sum / count),
            }))
            .sort((a, b) => a.avgScore - b.avgScore)
            .map((c) => c.category);

        // Build trend data points
        const trendData: CategoryTrendPoint[] = sortedWeeks.map(
            ([, { weekStart, categories }]) => {
                const point: CategoryTrendPoint = {
                    week: formatWeekLabel(weekStart),
                };

                for (const category of sortedCategories) {
                    const scores = categories.get(category);
                    if (scores && scores.length > 0) {
                        const avg = Math.round(
                            scores.reduce((a, b) => a + b, 0) / scores.length
                        );
                        point[category] = avg;
                    }
                }

                return point;
            }
        );

        return {
            trendData,
            categories: sortedCategories,
        };
    }, [results]);
}

export default useCategoryTrends;
