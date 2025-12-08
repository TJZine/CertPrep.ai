"use client";

import { useMemo } from "react";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";

import { type TrendDirection, calculateCategoryTrends } from "@/lib/analytics/trends";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface AdvancedAnalytics {
    // Exam Readiness
    readinessScore: number; // 0-100
    readinessConfidence: ConfidenceLevel;
    categoryReadiness: Map<string, number>;

    // Streaks
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number; // 0-100
    last7DaysActivity: boolean[]; // [today, yesterday, ..., 6 days ago]

    // Category Trends
    categoryTrends: Map<string, TrendDirection>;

    // Retry Comparison
    firstAttemptAvg: number | null;
    retryAvg: number | null;
    avgImprovement: number | null;

    isLoading: boolean;
}

// calculateCategoryTrends import moved to top

/**
 * Normalizes a timestamp to the start of day in local timezone.
 * Returns ISO-style YYYY-MM-DD format for proper sorting.
 */
function getDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Calculates exam readiness based on category performance.
 */
function calculateReadiness(
    results: Result[],
    quizzes: Quiz[],
): { score: number; confidence: ConfidenceLevel; categoryReadiness: Map<string, number> } {
    if (results.length === 0) {
        return { score: 0, confidence: "low", categoryReadiness: new Map() };
    }

    const categoryScores = new Map<string, { total: number; count: number }>();
    const quizMap = new Map(quizzes.map((q) => [q.id, q]));

    // Aggregate scores per category from category_breakdown
    for (const result of results) {
        const quiz = quizMap.get(result.quiz_id);
        if (!quiz || !result.category_breakdown) continue;

        for (const [category, score] of Object.entries(result.category_breakdown)) {
            const existing = categoryScores.get(category) || { total: 0, count: 0 };
            existing.total += score;
            existing.count += 1;
            categoryScores.set(category, existing);
        }
    }

    const categoryReadiness = new Map<string, number>();
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [category, data] of categoryScores) {
        const avgScore = Math.round(data.total / data.count);
        categoryReadiness.set(category, avgScore);
        // Weight by number of attempts in this category
        totalWeightedScore += avgScore * data.count;
        totalWeight += data.count;
    }

    const score = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    // Count results with category data for confidence
    const resultsWithData = results.filter(
        (r) => r.category_breakdown && Object.keys(r.category_breakdown).length > 0,
    ).length;

    // Confidence based on total attempts with data
    let confidence: ConfidenceLevel = "low";
    if (resultsWithData >= 10) {
        confidence = "high";
    } else if (resultsWithData >= 5) {
        confidence = "medium";
    }

    return { score, confidence, categoryReadiness };
}

/**
 * Calculates study streaks from result timestamps.
 */
function calculateStreaks(
    results: Result[],
): { current: number; longest: number; consistency: number; last7Days: boolean[] } {
    if (results.length === 0) {
        return { current: 0, longest: 0, consistency: 0, last7Days: Array(7).fill(false) };
    }

    // Group results by day
    const daySet = new Set<string>();
    for (const result of results) {
        daySet.add(getDateKey(result.timestamp));
    }

    const today = new Date();
    const last7Days: boolean[] = [];

    // Check activity for last 7 days
    for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        last7Days.push(daySet.has(getDateKey(checkDate.getTime())));
    }

    // Calculate current streak (consecutive days from today/yesterday backwards)
    let current = 0;
    const todayKey = getDateKey(today.getTime());
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getDateKey(yesterdayDate.getTime());

    // Start counting from today or yesterday
    const startFromToday = daySet.has(todayKey);
    const startFromYesterday = daySet.has(yesterdayKey);

    if (startFromToday || startFromYesterday) {
        const startOffset = startFromToday ? 0 : 1;
        // Safety bound to prevent infinite loop
        const MAX_STREAK_DAYS = 365 * 10;
        for (let i = startOffset; i < MAX_STREAK_DAYS; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            if (daySet.has(getDateKey(checkDate.getTime()))) {
                current++;
            } else {
                break;
            }
        }
    }

    // Calculate longest streak ever
    const sortedDays = Array.from(daySet)
        .map((key) => {
            const [year, month, day] = key.split("-").map(Number);
            return new Date(year!, month! - 1, day!).getTime();
        })
        .sort((a, b) => a - b);

    let longest = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
        const prev = sortedDays[i - 1]!;
        const curr = sortedDays[i]!;
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            tempStreak++;
        } else {
            longest = Math.max(longest, tempStreak);
            tempStreak = 1;
        }
    }
    longest = Math.max(longest, tempStreak);

    // Consistency = days active in last 30 days / 30
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let activeDays = 0;
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        if (daySet.has(getDateKey(checkDate.getTime()))) {
            activeDays++;
        }
    }
    const consistency = Math.round((activeDays / 30) * 100);

    return { current, longest, consistency, last7Days };
}



/**
 * Calculates first attempt vs retry comparison.
 */
function calculateRetryComparison(
    results: Result[],
): { firstAttemptAvg: number | null; retryAvg: number | null; avgImprovement: number | null } {
    if (results.length === 0) {
        return { firstAttemptAvg: null, retryAvg: null, avgImprovement: null };
    }

    // Group results by quiz_id, sorted by timestamp
    const byQuiz = new Map<string, Result[]>();
    for (const result of results) {
        const existing = byQuiz.get(result.quiz_id) || [];
        existing.push(result);
        byQuiz.set(result.quiz_id, existing);
    }

    const firstAttempts: number[] = [];
    const retryAttempts: number[] = [];

    for (const [, quizResults] of byQuiz) {
        // Sort by timestamp ascending
        quizResults.sort((a, b) => a.timestamp - b.timestamp);

        if (quizResults.length >= 1 && quizResults[0]) {
            firstAttempts.push(quizResults[0].score);
        }

        // All subsequent attempts are retries
        for (let i = 1; i < quizResults.length; i++) {
            const result = quizResults[i];
            if (result) {
                retryAttempts.push(result.score);
            }
        }
    }

    const firstAttemptAvg =
        firstAttempts.length > 0
            ? Math.round(firstAttempts.reduce((a, b) => a + b, 0) / firstAttempts.length)
            : null;

    const retryAvg =
        retryAttempts.length > 0
            ? Math.round(retryAttempts.reduce((a, b) => a + b, 0) / retryAttempts.length)
            : null;

    const avgImprovement =
        firstAttemptAvg !== null && retryAvg !== null ? retryAvg - firstAttemptAvg : null;

    return { firstAttemptAvg, retryAvg, avgImprovement };
}

/**
 * Advanced analytics hook providing exam readiness, streaks, trends, and retry comparison.
 * Performance optimized with memoization.
 *
 * @param results - Array of all quiz results.
 * @param quizzes - Array of available quizzes.
 * @returns An `AdvancedAnalytics` object containing calculated metrics and loading state.
 */
export function useAdvancedAnalytics(
    results: Result[],
    quizzes: Quiz[],
): AdvancedAnalytics {
    // Create stable dependency keys (includes all fields used by calculations)
    const resultsKey = useMemo(
        () =>
            results
                .map((r) => {
                    const categoryHash = Object.entries(r.category_breakdown || {})
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([k, v]) => `${k}=${v}`)
                        .join(",");
                    return `${r.id}:${r.quiz_id}:${r.score}:${r.timestamp}:${categoryHash}`;
                })
                .sort()
                .join("|"),
        [results],
    );

    const quizzesKey = useMemo(
        () =>
            quizzes
                .map((q) => `${q.id}:${q.version}`)
                .sort()
                .join("|"),
        [quizzes],
    );

    const analytics = useMemo(() => {
        if (results.length === 0 || quizzes.length === 0) {
            return {
                readinessScore: 0,
                readinessConfidence: "low" as ConfidenceLevel,
                categoryReadiness: new Map<string, number>(),
                currentStreak: 0,
                longestStreak: 0,
                consistencyScore: 0,
                last7DaysActivity: Array(7).fill(false) as boolean[],
                categoryTrends: new Map<string, TrendDirection>(),
                firstAttemptAvg: null,
                retryAvg: null,
                avgImprovement: null,
            };
        }

        const readiness = calculateReadiness(results, quizzes);
        const streaks = calculateStreaks(results);
        const categoryTrends = calculateCategoryTrends(results);
        const retryComparison = calculateRetryComparison(results);

        return {
            readinessScore: readiness.score,
            readinessConfidence: readiness.confidence,
            categoryReadiness: readiness.categoryReadiness,
            currentStreak: streaks.current,
            longestStreak: streaks.longest,
            consistencyScore: streaks.consistency,
            last7DaysActivity: streaks.last7Days,
            categoryTrends,
            ...retryComparison,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resultsKey, quizzesKey]);

    return useMemo(() => ({
        ...analytics,
        isLoading: false,
    }), [analytics]);
}

export default useAdvancedAnalytics;
