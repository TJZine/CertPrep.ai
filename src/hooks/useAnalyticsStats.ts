import { useState, useEffect, useMemo } from "react";
import { hashAnswer } from "@/lib/utils";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

export interface CategoryStat {
  category: string;
  score: number;
  correct: number;
  total: number;
}

export interface AnalyticsStats {
  categoryPerformance: CategoryStat[];
  weakAreas: { category: string; avgScore: number; totalQuestions: number }[];
  dailyStudyTime: { date: string; minutes: number }[];
  isLoading: boolean;
}

const DAYS_TO_TRACK = 14;

const formatDate = (timestamp: number | Date): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

/**
 * Asynchronously calculates analytics stats from results and quizzes.
 */
export function useAnalyticsStats(
  results: Result[],
  quizzes: Quiz[],
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
          return `${r.id}:${r.score}:${r.timestamp}:${r.time_taken_seconds}:${answersKey}`;
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

        // Calculate category performance
        const quizMap = new Map(quizzes.map((q) => [q.id, q]));

        // Calculate category performance
        const allResultsData = await Promise.all(
          results.map(async (result) => {
            const quiz = quizMap.get(result.quiz_id);
            if (!quiz) return [];

            return Promise.all(
              quiz.questions.map(async (question) => {
                const category = question.category || "Uncategorized";
                const userAnswer = result.answers[String(question.id)];
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

        const weakAreas = categoryPerformance
          .filter((cat) => cat.score < 70 && cat.total >= 3)
          .sort((a, b) => a.score - b.score)
          .slice(0, 5)
          .map((cat) => ({
            category: cat.category,
            avgScore: cat.score,
            totalQuestions: cat.total,
          }));

        // Calculate daily study time for the last DAYS_TO_TRACK days
        const now = new Date();
        const days: Map<string, number> = new Map();

        for (let i = DAYS_TO_TRACK - 1; i >= 0; i -= 1) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = formatDate(date.getTime());
          days.set(dateStr, 0);
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

          if (daysDiff < DAYS_TO_TRACK) {
            const dateStr = formatDate(resultDate);
            if (days.has(dateStr)) {
              days.set(
                dateStr,
                days.get(dateStr)! + Math.round(result.time_taken_seconds / 60),
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
  }, [resultsHash, quizzesHash]);

  return { ...stats, isLoading };
}
