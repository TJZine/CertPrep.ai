import { db } from './index';
import { calculatePercentage, generateUUID } from '@/lib/utils';
import type { CategoryPerformance, Result } from '@/types/result';
import type { Quiz, QuizMode } from '@/types/quiz';

export interface CreateResultInput {
  quizId: string;
  mode: QuizMode;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
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
export function calculateResults(
  quiz: Quiz,
  answers: Record<string, string>,
): { score: number; categoryBreakdown: Record<string, number> } {
  let correctCount = 0;
  const categoryTotals: Record<string, { correct: number; total: number }> = {};

  quiz.questions.forEach((question) => {
    const category = question.category || 'Uncategorized';
    const userAnswer = answers[String(question.id)];
    const isCorrect = userAnswer === question.correct_answer;

    if (!categoryTotals[category]) {
      categoryTotals[category] = { correct: 0, total: 0 };
    }

    categoryTotals[category].total += 1;
    if (isCorrect) {
      categoryTotals[category].correct += 1;
      correctCount += 1;
    }
  });

  const score = calculatePercentage(correctCount, quiz.questions.length);
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
  const quiz = await db.quizzes.get(input.quizId);

  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const { score, categoryBreakdown } = calculateResults(quiz, input.answers);
  const result: Result = {
    id: generateUUID(),
    quiz_id: input.quizId,
    timestamp: Date.now(),
    mode: input.mode,
    score,
    time_taken_seconds: input.timeTakenSeconds,
    answers: input.answers,
    flagged_questions: input.flaggedQuestions,
    category_breakdown: categoryBreakdown,
  };

  await db.results.add(result);
  return result;
}

/**
 * Retrieves a result by its identifier.
 */
export async function getResultById(id: string): Promise<Result | undefined> {
  return db.results.get(id);
}

/**
 * Retrieves all results for a quiz ordered by newest first.
 */
export async function getResultsByQuizId(quizId: string): Promise<Result[]> {
  const results = await db.results.where('quiz_id').equals(quizId).sortBy('timestamp');
  return results.reverse();
}

/**
 * Retrieves all results ordered by newest first.
 */
export async function getAllResults(): Promise<Result[]> {
  return db.results.orderBy('timestamp').reverse().toArray();
}

/**
 * Deletes a result by its identifier.
 */
export async function deleteResult(id: string): Promise<void> {
  await db.results.delete(id);
}

/**
 * Aggregates category performance across all attempts for a quiz.
 */
export async function getCategoryPerformance(quizId: string): Promise<CategoryPerformance[]> {
  const quiz = await db.quizzes.get(quizId);

  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const results = await getResultsByQuizId(quizId);
  const totals: Record<string, { correct: number; total: number }> = {};

  results.forEach((result) => {
    quiz.questions.forEach((question) => {
      const category = question.category || 'Uncategorized';
      const userAnswer = result.answers[String(question.id)];
      const isCorrect = userAnswer === question.correct_answer;

      if (!totals[category]) {
        totals[category] = { correct: 0, total: 0 };
      }

      totals[category].total += 1;
      if (isCorrect) {
        totals[category].correct += 1;
      }
    });
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
export async function getMissedQuestions(resultId: string): Promise<string[]> {
  const result = await db.results.get(resultId);
  if (!result) {
    throw new Error('Result not found.');
  }

  const quiz = await db.quizzes.get(result.quiz_id);
  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  return quiz.questions
    .filter((question) => result.answers[String(question.id)] !== question.correct_answer)
    .map((question) => String(question.id));
}

/**
 * Aggregates global statistics across all quizzes and results.
 */
export async function getOverallStats(): Promise<OverallStats> {
  const [quizzes, results] = await Promise.all([db.quizzes.toArray(), db.results.toArray()]);
  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  const totalQuizzes = quizzes.length;
  const totalAttempts = results.length;
  const totalStudyTime = results.reduce((sum, result) => sum + result.time_taken_seconds, 0);
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

  const categoryTotals: Record<string, { correct: number; total: number }> = {};

  results.forEach((result) => {
    const quiz = quizMap.get(result.quiz_id);
    if (!quiz) {
      return;
    }

    quiz.questions.forEach((question) => {
      const category = question.category || 'Uncategorized';
      const userAnswer = result.answers[String(question.id)];
      const isCorrect = userAnswer === question.correct_answer;

      if (!categoryTotals[category]) {
        categoryTotals[category] = { correct: 0, total: 0 };
      }

      categoryTotals[category].total += 1;
      if (isCorrect) {
        categoryTotals[category].correct += 1;
      }
    });
  });

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
