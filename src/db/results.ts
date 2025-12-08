import { db } from "./index";
import { NIL_UUID } from "@/lib/constants";
import { calculatePercentage, generateUUID } from "@/lib/utils";
import type { CategoryPerformance, Result } from "@/types/result";
import type { Quiz, QuizMode } from "@/types/quiz";
import { evaluateAnswer } from "@/lib/grading";

export interface CreateResultInput {
  quizId: string;
  mode: QuizMode;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
  activeQuestionIds?: string[];
  userId: string;
}

export interface OverallStats {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  totalStudyTime: number;
  weakestCategories: Array<{ category: string; avgScore: number }>;
}

/**
 * Calculates overall and per-category performance for a completed quiz.
 */
export async function calculateResults(
  quiz: Quiz,
  answers: Record<string, string>,
  activeQuestionIds?: string[],
): Promise<{ score: number; categoryBreakdown: Record<string, number> }> {
  let correctCount = 0;
  const categoryTotals: Record<string, { correct: number; total: number }> = {};

  const questionsToScore = activeQuestionIds
    ? quiz.questions.filter((q) => activeQuestionIds.includes(q.id))
    : quiz.questions;

  const questionResults = await Promise.all(
    questionsToScore.map(async (question) => {
      const userAnswer = answers[String(question.id)];
      return evaluateAnswer(question, userAnswer);
    }),
  );

  questionResults.forEach(({ category, isCorrect }) => {
    if (!categoryTotals[category]) {
      categoryTotals[category] = { correct: 0, total: 0 };
    }

    categoryTotals[category].total += 1;
    if (isCorrect) {
      categoryTotals[category].correct += 1;
      correctCount += 1;
    }
  });

  const score = calculatePercentage(correctCount, questionsToScore.length);
  const categoryBreakdown = Object.fromEntries(
    Object.entries(categoryTotals).map(([category, { correct, total }]) => [
      category,
      calculatePercentage(correct, total),
    ]),
  );

  return { score, categoryBreakdown };
}

/**
 * Persists a quiz result and returns the stored entity.
 */
export async function createResult(input: CreateResultInput): Promise<Result> {
  if (!input.userId) {
    throw new Error("Cannot create result without a user context.");
  }

  const quiz = await db.quizzes.get(input.quizId);

  if (!quiz) {
    throw new Error("Quiz not found.");
  }

  // Allow taking a quiz if the user owns it OR if it's a System/Public quiz
  if (quiz.user_id !== input.userId && quiz.user_id !== NIL_UUID) {
    throw new Error(
      "Security mismatch: Quiz does not belong to the current user.",
    );
  }

  const { score, categoryBreakdown } = await calculateResults(
    quiz,
    input.answers,
    input.activeQuestionIds,
  );
  const result: Result = {
    id: generateUUID(),
    quiz_id: input.quizId,
    user_id: input.userId,
    timestamp: Date.now(),
    mode: input.mode,
    score,
    time_taken_seconds: input.timeTakenSeconds,
    answers: input.answers,
    flagged_questions: input.flaggedQuestions,
    category_breakdown: categoryBreakdown,
    question_ids: input.activeQuestionIds, // Persist for accurate grading on results page
    synced: 0,
  };

  await db.results.add(result);
  return result;
}

/**
 * Retrieves a result by its identifier.
 */
export async function getResultById(
  id: string,
  userId: string,
): Promise<Result | undefined> {
  const result = await db.results.get(id);
  if (result?.user_id !== userId || result?.deleted_at) return undefined;
  return result;
}

/**
 * Retrieves all results for a quiz ordered by newest first.
 */
export async function getResultsByQuizId(
  quizId: string,
  userId: string,
): Promise<Result[]> {
  const results = await db.results
    .where("[user_id+quiz_id]")
    .equals([userId, quizId])
    .filter((r) => !r.deleted_at)
    .sortBy("timestamp");
  return results.reverse();
}

/**
 * Retrieves all results ordered by newest first.
 */
export async function getAllResults(userId: string): Promise<Result[]> {
  const results = await db.results
    .where("user_id")
    .equals(userId)
    .filter((r) => !r.deleted_at)
    .sortBy("timestamp");
  return results.reverse();
}

/**
 * Deletes a result by its identifier, scoped to the current user.
 * Performs a soft delete locally to allow sync to propagate the deletion.
 */
export async function deleteResult(id: string, userId: string): Promise<void> {
  const result = await db.results.get(id);
  if (!result || result.user_id !== userId) {
    throw new Error("Result not found for this user.");
  }

  // Soft delete: Mark as deleted and reset synced status so sync worker picks it up
  await db.results.update(id, {
    deleted_at: Date.now(),
    synced: 0,
  });
}

/**
 * Aggregates category performance across all attempts for a quiz.
 */
export async function getCategoryPerformance(
  quizId: string,
  userId: string,
): Promise<CategoryPerformance[]> {
  const quiz = await db.quizzes.get(quizId);

  if (!quiz) {
    throw new Error("Quiz not found.");
  }

  const results = await getResultsByQuizId(quizId, userId); // Uses filtered getter
  const totals: Record<string, { correct: number; total: number }> = {};

  const allResultsData = await Promise.all(
    results.map(async (result) => {
      return Promise.all(
        quiz.questions.map(async (question) => {
          const userAnswer = result.answers[String(question.id)];
          return evaluateAnswer(question, userAnswer);
        }),
      );
    }),
  );

  allResultsData.flat().forEach(({ category, isCorrect }) => {
    if (!totals[category]) {
      totals[category] = { correct: 0, total: 0 };
    }

    totals[category].total += 1;
    if (isCorrect) {
      totals[category].correct += 1;
    }
  });

  return Object.entries(totals)
    .map(([category, { correct, total }]) => ({
      category,
      correct,
      total,
      percentage: calculatePercentage(correct, total),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Returns the IDs of questions answered incorrectly for a given result.
 */
export async function getMissedQuestions(
  resultId: string,
  userId: string,
): Promise<string[]> {
  const result = await db.results.get(resultId);
  if (!result || result.deleted_at) {
    throw new Error("Result not found.");
  }
  if (result.user_id !== userId) {
    throw new Error("Result not accessible for this user.");
  }

  const quiz = await db.quizzes.get(result.quiz_id);
  if (!quiz) {
    throw new Error("Quiz not found.");
  }

  const questionResults = await Promise.all(
    quiz.questions.map(async (question) => {
      const userAnswer = result.answers[String(question.id)];
      if (!userAnswer) return null;

      const { isCorrect } = await evaluateAnswer(question, userAnswer);

      return !isCorrect ? String(question.id) : null;
    }),
  );

  return questionResults.filter((id): id is string => id !== null);
}

/**
 * Aggregates global statistics across all quizzes and results.
 */
export async function getOverallStats(userId: string): Promise<OverallStats> {
  const [allQuizzes, allResults] = await Promise.all([
    db.quizzes.where("user_id").equals(userId).toArray(),
    db.results.where("user_id").equals(userId).toArray(),
  ]);

  // Filter out deleted results manually since we used toArray()
  const results = allResults.filter((r) => !r.deleted_at);
  const quizzes = allQuizzes.filter((q) => !q.deleted_at);



  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  const totalQuizzes = quizzes.length;
  const totalAttempts = results.length;
  const totalStudyTime = results.reduce(
    (sum, result) => sum + result.time_taken_seconds,
    0,
  );
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const averageScore =
    totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

  const categoryTotals: Record<string, { correct: number; total: number }> = {};

  // Process results in batches to avoid blocking the main thread with unbounded concurrency
  const BATCH_SIZE = 50;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map(async (result) => {
        const quiz = quizMap.get(result.quiz_id);
        if (!quiz) {
          return [];
        }

        return Promise.all(
          quiz.questions.map(async (question) => {
            const userAnswer = result.answers[String(question.id)];
            return evaluateAnswer(question, userAnswer);
          }),
        );
      }),
    );

    batchData.flat().forEach(({ category, isCorrect }) => {
      if (!categoryTotals[category]) {
        categoryTotals[category] = { correct: 0, total: 0 };
      }

      categoryTotals[category].total += 1;
      if (isCorrect) {
        categoryTotals[category].correct += 1;
      }
    });
  }

  const weakestCategories = Object.entries(categoryTotals)
    .map(([category, { correct, total }]) => ({
      category,
      avgScore: calculatePercentage(correct, total),
    }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  return {
    totalQuizzes,
    totalAttempts,
    averageScore,
    totalStudyTime,
    weakestCategories,
  };
}