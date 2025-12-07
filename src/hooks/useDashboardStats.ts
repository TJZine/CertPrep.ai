import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { calculatePercentage } from "@/lib/utils";
import type { QuizStats } from "@/db/quizzes";
import type { OverallStats } from "@/db/results";
import type { Result } from "@/types/result";

export interface DashboardStats {
  quizStats: Map<string, QuizStats>;
  overallStats: OverallStats | null;
  isLoading: boolean;
}

/**
 * Reactive hook that aggregates stats for the dashboard.
 * Subscribes to changes in both `quizzes` and `results` tables.
 */
export function useDashboardStats(userId: string | undefined): DashboardStats {
  const data = useLiveQuery(async () => {
    if (!userId) {
      return { quizStats: new Map(), overallStats: null };
    }

    // Parallel fetch for speed
    const [allQuizzes, allResults] = await Promise.all([
      db.quizzes
        .where("user_id")
        .equals(userId)
        .filter((q) => !q.deleted_at)
        .toArray(),
      db.results
        .where("user_id")
        .equals(userId)
        .filter((r) => !r.deleted_at)
        .sortBy("timestamp"),
    ]);

    // 1. Calculate Overall Stats
    const totalQuizzes = allQuizzes.length;
    const totalAttempts = allResults.length;
    const totalStudyTime = allResults.reduce(
      (sum, r) => sum + r.time_taken_seconds,
      0,
    );
    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore =
      totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

    const overallStats: OverallStats = {
      totalQuizzes,
      totalAttempts,
      averageScore,
      totalStudyTime,
      weakestCategories: [], // Optimization: Dashboard doesn't use this yet.
    };

    // 2. Calculate Per-Quiz Stats
    const statsMap = new Map<string, QuizStats>();
    const resultsByQuiz = new Map<string, Result[]>();

    // Group results
    for (const result of allResults) {
      const qId = result.quiz_id;
      if (!resultsByQuiz.has(qId)) {
        resultsByQuiz.set(qId, []);
      }
      resultsByQuiz.get(qId)?.push(result);
    }

    for (const quiz of allQuizzes) {
      const attempts = resultsByQuiz.get(quiz.id) || [];
      const attemptCount = attempts.length;

      if (attemptCount === 0) {
        statsMap.set(quiz.id, {
          quizId: quiz.id,
          attemptCount: 0,
          lastAttemptScore: null,
          lastAttemptDate: null,
          averageScore: null,
          bestScore: null,
          totalStudyTime: 0,
        });
        continue;
      }

      // attempts are already sorted by timestamp (ascending) because we used sortBy("timestamp") on the query
      const lastAttempt = attempts[attempts.length - 1];
      if (!lastAttempt) {
         continue;
      }
      
      const qTotalScore = attempts.reduce((sum, r) => sum + r.score, 0);
      const qBestScore = Math.max(...attempts.map((r) => r.score));
      const qAverageScore = calculatePercentage(
        qTotalScore,
        attemptCount * 100,
      );
      const qTotalTime = attempts.reduce(
        (sum, r) => sum + r.time_taken_seconds,
        0,
      );

      statsMap.set(quiz.id, {
        quizId: quiz.id,
        attemptCount,
        lastAttemptScore: lastAttempt.score,
        lastAttemptDate: lastAttempt.timestamp,
        averageScore: qAverageScore,
        bestScore: qBestScore,
        totalStudyTime: qTotalTime,
      });
    }

    return { quizStats: statsMap, overallStats };
  }, [userId]);

  return {
    quizStats: data?.quizStats ?? new Map(),
    overallStats: data?.overallStats ?? null,
    isLoading: !userId ? false : data === undefined,
  };
}
