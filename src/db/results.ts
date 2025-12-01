import { db } from './index';
import { calculatePercentage, generateUUID, hashAnswer } from '@/lib/utils';
import type { CategoryPerformance, Result } from '@/types/result';
import type { Quiz, QuizMode } from '@/types/quiz';

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
  activeQuestionIds?: string[]
): Promise<{ score: number; categoryBreakdown: Record<string, number> }> {
  let correctCount = 0;
  const categoryTotals: Record<string, { correct: number; total: number }> = {};

  const questionsToScore = activeQuestionIds
    ? quiz.questions.filter((q) => activeQuestionIds.includes(q.id))
    : quiz.questions;

  const questionResults = await Promise.all(
    questionsToScore.map(async (question) => {
      const category = question.category || 'Uncategorized';
      const userAnswer = answers[String(question.id)];
      
      let isCorrect = false;
      if (userAnswer) {
        const userHash = await hashAnswer(userAnswer);
        if (question.correct_answer_hash) {
          isCorrect = userHash === question.correct_answer_hash;
        } else if (question.correct_answer) {
          isCorrect = userAnswer === question.correct_answer;
        }
      }
      return { category, isCorrect };
    })
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
    throw new Error('Cannot create result without a user context.');
  }

  const quiz = await db.quizzes.get(input.quizId);

  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const { score, categoryBreakdown } = await calculateResults(quiz, input.answers, input.activeQuestionIds);
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
    synced: 0,
  };

  await db.results.add(result);
  return result;
}

/**
 * Retrieves a result by its identifier.
 */
export async function getResultById(id: string, userId: string): Promise<Result | undefined> {
  const result = await db.results.get(id);
  if (result?.user_id !== userId) return undefined;
  return result;
}

/**
 * Retrieves all results for a quiz ordered by newest first.
 */
export async function getResultsByQuizId(quizId: string, userId: string): Promise<Result[]> {
  const results = await db.results.where('[user_id+quiz_id]').equals([userId, quizId]).sortBy('timestamp');
  return results.reverse();
}

/**
 * Retrieves all results ordered by newest first.
 */
export async function getAllResults(userId: string): Promise<Result[]> {
  const results = await db.results.where('user_id').equals(userId).sortBy('timestamp');
  return results.reverse();
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
export async function getCategoryPerformance(quizId: string, userId: string): Promise<CategoryPerformance[]> {
  const quiz = await db.quizzes.get(quizId);

  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const results = await getResultsByQuizId(quizId, userId);
  const totals: Record<string, { correct: number; total: number }> = {};

  const allResultsData = await Promise.all(
    results.map(async (result) => {
      return Promise.all(
        quiz.questions.map(async (question) => {
          const category = question.category || 'Uncategorized';
          const userAnswer = result.answers[String(question.id)];
          
          let isCorrect = false;
          if (userAnswer) {
            const userHash = await hashAnswer(userAnswer);
            if (question.correct_answer_hash) {
              isCorrect = userHash === question.correct_answer_hash;
            } else if (question.correct_answer) {
              isCorrect = userAnswer === question.correct_answer;
            }
          }
          return { category, isCorrect };
        })
      );
    })
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
export async function getMissedQuestions(resultId: string, userId: string): Promise<string[]> {
  const result = await db.results.get(resultId);
  if (!result) {
    throw new Error('Result not found.');
  }
  if (result.user_id !== userId) {
    throw new Error('Result not accessible for this user.');
  }

  const quiz = await db.quizzes.get(result.quiz_id);
  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const questionResults = await Promise.all(
    quiz.questions.map(async (question) => {
      const userAnswer = result.answers[String(question.id)];
      if (!userAnswer) return null;

      const userHash = await hashAnswer(userAnswer);
      
      let isCorrect = false;
      if (question.correct_answer_hash) {
        isCorrect = userHash === question.correct_answer_hash;
      } else if (question.correct_answer) {
        isCorrect = userAnswer === question.correct_answer;
      }
      
      return !isCorrect ? String(question.id) : null;
    })
  );

  return questionResults.filter((id): id is string => id !== null);
}

/**
 * Aggregates global statistics across all quizzes and results.
 */
export async function getOverallStats(userId: string): Promise<OverallStats> {
  const [quizzes, results] = await Promise.all([
    db.quizzes.toArray(),
    db.results.where('user_id').equals(userId).toArray(),
  ]);
  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  const totalQuizzes = quizzes.length;
  const totalAttempts = results.length;
  const totalStudyTime = results.reduce((sum, result) => sum + result.time_taken_seconds, 0);
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

  const categoryTotals: Record<string, { correct: number; total: number }> = {};

  const allResultsData = await Promise.all(
    results.map(async (result) => {
      const quiz = quizMap.get(result.quiz_id);
      if (!quiz) {
        return [];
      }

      return Promise.all(
        quiz.questions.map(async (question) => {
          const category = question.category || 'Uncategorized';
          const userAnswer = result.answers[String(question.id)];
          
          let isCorrect = false;
          if (userAnswer) {
            const userHash = await hashAnswer(userAnswer);
            if (question.correct_answer_hash) {
              isCorrect = userHash === question.correct_answer_hash;
            } else if (question.correct_answer) {
              isCorrect = userAnswer === question.correct_answer;
            }
          }
          return { category, isCorrect };
        })
      );
    })
  );

  allResultsData.flat().forEach(({ category, isCorrect }) => {
    if (!categoryTotals[category]) {
      categoryTotals[category] = { correct: 0, total: 0 };
    }

    categoryTotals[category].total += 1;
    if (isCorrect) {
      categoryTotals[category].correct += 1;
    }
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
