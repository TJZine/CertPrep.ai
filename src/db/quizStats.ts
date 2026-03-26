import { db } from "./dbInstance";
import { calculatePercentage } from "@/lib/utils/math";;
import type { Result } from "@/types/result";

export interface QuizStats {
  quizId: string;
  attemptCount: number;
  lastAttemptScore: number | null;
  lastAttemptDate: number | null;
  averageScore: number | null;
  bestScore: number | null;
  totalStudyTime: number;
}

/**
 * Aggregates quiz statistics from associated results.
 */
export async function getQuizStats(
  quizId: string,
  userId: string,
): Promise<QuizStats> {
  const attempts = (await db.results
    .where("[user_id+quiz_id]")
    .equals([userId, quizId])
    .sortBy("timestamp")) as Result[];

  const attemptCount = attempts.length;
  if (attemptCount === 0) {
    return {
      quizId,
      attemptCount: 0,
      lastAttemptScore: null,
      lastAttemptDate: null,
      averageScore: null,
      bestScore: null,
      totalStudyTime: 0,
    };
  }

  const lastAttempt = attempts[attemptCount - 1];
  if (!lastAttempt) {
    return {
      quizId,
      attemptCount,
      lastAttemptScore: null,
      lastAttemptDate: null,
      averageScore: null,
      bestScore: null,
      totalStudyTime: 0,
    };
  }

  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const bestScore = Math.max(...attempts.map((attempt) => attempt.score));
  const averageScore = calculatePercentage(totalScore, attemptCount * 100);
  const totalStudyTime = attempts.reduce(
    (sum, attempt) => sum + attempt.time_taken_seconds,
    0,
  );

  return {
    quizId,
    attemptCount,
    lastAttemptScore: lastAttempt.score,
    lastAttemptDate: lastAttempt.timestamp,
    averageScore,
    bestScore,
    totalStudyTime,
  };
}

