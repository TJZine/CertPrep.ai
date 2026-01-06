import { useState, useEffect, useMemo } from "react";
import { calculateCategoryTrends, type TrendDirection } from "@/lib/analytics/trends";
import { formatDateKey } from "@/lib/date";
import { hashAnswer } from "@/lib/utils";
import type { Quiz, Question } from "@/types/quiz";
import type { Result } from "@/types/result";

export interface CategoryStat {
  category: string;
  score: number;
  correct: number;
  total: number;
}

export interface AnalyticsStats {
  categoryPerformance: CategoryStat[];
  weakAreas: { category: string; avgScore: number; totalQuestions: number; recentTrend?: TrendDirection }[];
  dailyStudyTime: { date: string; minutes: number }[];
  isLoading: boolean;
}

const DEFAULT_DAYS_TO_TRACK = 14;

/**
 * Asynchronously calculates analytics stats from results and quizzes.
 *
 * @param results - Array of all quiz results.
 * @param quizzes - Array of available quizzes.
 * @param daysToTrack - Number of days to show in dailyStudyTime (default: 14).
 * @returns An `AnalyticsStats` object containing category performance, weak areas, and daily study time.
 */
export function useAnalyticsStats(
  results: Result[],
  quizzes: Quiz[],
  daysToTrack: number = DEFAULT_DAYS_TO_TRACK,
): AnalyticsStats {
  const [stats, setStats] = useState<Omit<AnalyticsStats, "isLoading">>({
    categoryPerformance: [],
    weakAreas: [],
    dailyStudyTime: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Create stable keys for dependencies using meaningful fields to avoid stale analytics
  const resultsHash = useMemo(
    () =>
      results
        .map((r) => {
          const answersKey = Object.entries(r.answers || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}:${value}`)
            .join(",");
          const questionIdsKey = (r.question_ids ?? []).join(",");
          const categoryBreakdownKey = r.category_breakdown
            ? Object.entries(r.category_breakdown)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, val]) => `${cat}:${val}`)
              .join(",")
            : "";
          return `${r.id}:${r.score}:${r.timestamp}:${r.time_taken_seconds}:${answersKey}:${questionIdsKey}:${categoryBreakdownKey}`;
        })
        .sort()
        .join("|"),
    [results],
  );
  const quizzesHash = useMemo(
    () =>
      quizzes
        .map((q) => `${q.id}:${q.version}:${q.updated_at ?? 0}`)
        .sort()
        .join("|"),
    [quizzes],
  );

  useEffect(() => {
    let isMounted = true;
    const calculate = async (): Promise<void> => {
      // Safety timeout to ensure we don't hang forever
      const safetyTimeout = setTimeout(() => {
        if (isMounted) {
          console.warn("Analytics calculation timed out after 5s");
          setIsLoading(false);
        }
      }, 5000);

      try {
        // Force async execution to avoid "setState in effect" lint error
        await Promise.resolve();

        if (!isMounted) return;
        setIsLoading(true);

        if (!results.length || !quizzes.length) {
          setStats({
            categoryPerformance: [],
            weakAreas: [],
            dailyStudyTime: [],
          });
          return;
        }

        const categories = new Map<
          string,
          { correct: number; total: number }
        >();

        // Pre-index all questions from all available quizzes for O(1) lookup
        // This is crucial for "aggregated" results (Topic Study/SRS) where the
        // source quiz (SRS quiz) is empty or missing from the passed `quizzes` list,
        // but the questions themselves exist in other user quizzes.
        const allQuestionsMap = new Map<string, { question: Question; quizId: string }>();
        quizzes.forEach((q) => {
          q.questions.forEach((question) => {
            allQuestionsMap.set(question.id, { question, quizId: q.id });
          });
        });

        // Calculate category performance
        const quizMap = new Map(quizzes.map((q) => [q.id, q]));

        // Calculate category performance
        const allResultsData = await Promise.all(
          results.map(async (result) => {
            let sessionQuestions: Question[] = [];

            const quiz = quizMap.get(result.quiz_id);

            // CASE 1: Normal Quiz Result
            if (quiz && quiz.questions.length > 0) {
              // Filter to only questions served in this session (Smart Round, Review Missed)
              const idSet = result.question_ids
                ? new Set(result.question_ids)
                : null;
              sessionQuestions = idSet
                ? quiz.questions.filter((q) => idSet.has(q.id))
                : quiz.questions;
            }
            // CASE 2: Aggregated Result (Topic Study / SRS)
            // The result has a list of question_ids, but the linked quiz is either 
            // missing (filtered out) or empty (SRS quiz).
            // We resolve the questions from our global map.
            else if (result.question_ids && result.question_ids.length > 0) {
              sessionQuestions = result.question_ids
                .map(id => allQuestionsMap.get(id)?.question)
                .filter((q): q is Question => !!q);
            }

            if (sessionQuestions.length === 0) return [];

            return Promise.all(
              sessionQuestions.map(async (question) => {
                const category = question.category || "Uncategorized";
                const userAnswer = result.answers[question.id];
                let isCorrect = false;

                if (userAnswer) {
                  const userHash = await hashAnswer(userAnswer);
                  if (userHash === question.correct_answer_hash) {
                    isCorrect = true;
                  }
                }
                return { category, isCorrect };
              }),
            );
          }),
        );

        allResultsData.flat().forEach(({ category, isCorrect }) => {
          if (!categories.has(category)) {
            categories.set(category, { correct: 0, total: 0 });
          }

          const cat = categories.get(category)!;
          cat.total += 1;
          if (isCorrect) {
            cat.correct += 1;
          }
        });

        const categoryPerformance = Array.from(categories.entries()).map(
          ([category, data]) => ({
            category,
            score:
              data.total > 0
                ? Math.round((data.correct / data.total) * 100)
                : 0,
            correct: data.correct,
            total: data.total,
          }),
        );

        // Calculate trends per category using shared utility
        const categoryTrends = calculateCategoryTrends(results);

        const weakAreas = categoryPerformance
          .filter((cat) => cat.score < 70 && cat.total >= 3)
          .sort((a, b) => a.score - b.score)
          .slice(0, 5)
          .map((cat) => ({
            category: cat.category,
            avgScore: cat.score,
            totalQuestions: cat.total,
            recentTrend: categoryTrends.get(cat.category),
          }));

        // Calculate daily study time for the last daysToTrack days
        const now = new Date();
        const days: Map<string, number> = new Map();

        for (let i = daysToTrack - 1; i >= 0; i -= 1) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateKey = formatDateKey(date.getTime());
          days.set(dateKey, 0);
        }

        results.forEach((result) => {
          const resultDate = new Date(result.timestamp);
          // Normalize to start of day for consistent comparison
          const resultDay = new Date(
            resultDate.getFullYear(),
            resultDate.getMonth(),
            resultDate.getDate(),
          );
          const nowDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const daysDiff = Math.floor(
            (nowDay.getTime() - resultDay.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysDiff < daysToTrack) {
            const dateKey = formatDateKey(resultDate);
            if (days.has(dateKey)) {
              days.set(
                dateKey,
                days.get(dateKey)! + Math.round(result.time_taken_seconds / 60),
              );
            }
          }
        });

        const dailyStudyTime = Array.from(days.entries()).map(
          ([date, minutes]) => ({ date, minutes }),
        );

        if (isMounted) {
          setStats({
            categoryPerformance,
            weakAreas,
            dailyStudyTime,
          });
        }
      } catch (error) {
        console.error("Failed to calculate analytics stats:", error);
        // Reset to empty state on error
        if (isMounted) {
          setStats({
            categoryPerformance: [],
            weakAreas: [],
            dailyStudyTime: [],
          });
        }
      } finally {
        clearTimeout(safetyTimeout);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    calculate();

    return (): void => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsHash, quizzesHash, daysToTrack]);

  return { ...stats, isLoading };
}
