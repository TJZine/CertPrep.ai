import { db } from "./dbInstance";
import { getAllResults, getResultsByQuizId } from "./resultQueries";
import { calculatePercentage } from "@/lib/utils/math";
import { logger } from "@/lib/logger";
import { evaluateAnswer } from "@/lib/grading";
import type { CategoryPerformance, Result } from "@/types/result";
import type { Question, Quiz } from "@/types/quiz";

export interface OverallStats {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  totalStudyTime: number;
  weakestCategories: Array<{ category: string; avgScore: number }>;
}

function resolveSessionQuestions(
  result: Result,
  quiz: Quiz | undefined,
  allQuestionsMap: Map<string, { question: Question; quizId: string }>,
): Question[] {
  if (result.question_ids !== undefined) {
    if (quiz && quiz.questions.length > 0) {
      const idSet = new Set(result.question_ids);
      return quiz.questions.filter((question) => idSet.has(question.id));
    }

    return result.question_ids
      .map((id) => allQuestionsMap.get(id)?.question)
      .filter((question): question is Question => !!question);
  }

  if (quiz && quiz.questions.length > 0) {
    return quiz.questions;
  }

  return [];
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

  const results = await getResultsByQuizId(quizId, userId);
  const totals: Record<string, { correct: number; total: number }> = {};
  const allQuestionsMap = new Map(
    quiz.questions.map((question) => [
      question.id,
      { question, quizId: quiz.id },
    ]),
  );

  const BATCH_SIZE = 50;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map(async (result) => {
        const sessionQuestions = resolveSessionQuestions(
          result,
          quiz,
          allQuestionsMap,
        );

        return Promise.all(
          sessionQuestions.map(async (question) => {
            const userAnswer = result.answers[String(question.id)];
            return evaluateAnswer(question, userAnswer);
          }),
        );
      }),
    );

    batchData.flat().forEach(({ category, isCorrect }) => {
      if (!totals[category]) {
        totals[category] = { correct: 0, total: 0 };
      }

      totals[category].total += 1;
      if (isCorrect) {
        totals[category].correct += 1;
      }
    });
  }

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
 * Aggregates global statistics across all quizzes and results.
 */
export async function getOverallStats(userId: string): Promise<OverallStats> {
  const [allQuizzes, allResults] = await Promise.all([
    db.quizzes.where("user_id").equals(userId).toArray(),
    db.results.where("user_id").equals(userId).toArray(),
  ]);

  const results = allResults.filter((r) => !r.deleted_at);
  const quizzes = allQuizzes.filter((q) => !q.deleted_at);

  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const allQuestionsMap = new Map<string, { question: Question; quizId: string }>();
  quizzes.forEach((q) => {
    if (!q.questions) return;
    q.questions.forEach((question) => {
      allQuestionsMap.set(question.id, { question, quizId: q.id });
    });
  });

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

  const BATCH_SIZE = 50;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map(async (result) => {
        const quiz = quizMap.get(result.quiz_id);
        const sessionQuestions = resolveSessionQuestions(
          result,
          quiz,
          allQuestionsMap,
        );

        if (sessionQuestions.length === 0) return [];

        return Promise.all(
          sessionQuestions.map(async (question) => {
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

/**
 * Data returned by getTopicStudyQuestions for Topic Study sessions.
 */
export interface TopicStudyData {
  questionIds: string[];
  quizIds: string[];
  missedCount: number;
  flaggedCount: number;
  totalUniqueCount: number;
}

/**
 * Collects all missed and flagged questions for a specific category
 * across all of a user's quizzes.
 */
export async function getTopicStudyQuestions(
  userId: string,
  category: string,
): Promise<TopicStudyData> {
  const allResults = await getAllResults(userId);

  const allQuizzesRaw = await db.quizzes
    .where("user_id")
    .equals(userId)
    .toArray();

  const allQuizzes = allQuizzesRaw.filter((q) => q.deleted_at == null);

  const quizMap = new Map(allQuizzes.map((quiz) => [quiz.id, quiz]));
  const allQuestionsMap = new Map<string, { question: Question; quizId: string }>();
  allQuizzes.forEach((q) => {
    q.questions.forEach((question) => {
      allQuestionsMap.set(question.id, { question, quizId: q.id });
    });
  });

  const processedQuestionIds = new Set<string>();
  const missedIds = new Set<string>();
  const flaggedIds = new Set<string>();
  const sourceQuizIds = new Set<string>();

  const BATCH_SIZE = 50;
  for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
    const batch = allResults.slice(i, i + BATCH_SIZE);

    for (const result of batch) {
      const quiz = quizMap.get(result.quiz_id);
      const sessionQuestions = resolveSessionQuestions(
        result,
        quiz,
        allQuestionsMap,
      );

      if (sessionQuestions.length === 0) continue;

      const categoryQuestions = sessionQuestions.filter((q) => {
        const qCategory = q.category || "Uncategorized";
        return qCategory === category;
      });

      for (const question of categoryQuestions) {
        try {
          const questionId = String(question.id);
          if (processedQuestionIds.has(questionId)) {
            continue;
          }

          processedQuestionIds.add(questionId);

          const isFlagged = result.flagged_questions.includes(questionId);
          const userAnswer = result.answers[questionId];
          let isMissed = false;

          if (userAnswer) {
            const { isCorrect } = await evaluateAnswer(question, userAnswer);
            isMissed = !isCorrect;
          }

          if (isFlagged) {
            flaggedIds.add(questionId);
          }

          if (isMissed) {
            missedIds.add(questionId);
          }

          if (isFlagged || isMissed) {
            const sourceInfo = allQuestionsMap.get(questionId);
            if (sourceInfo) {
              sourceQuizIds.add(sourceInfo.quizId);
            } else if (quiz) {
              sourceQuizIds.add(quiz.id);
            }
          }
        } catch (error) {
          logger.error("Failed to process topic study question", {
            error,
            quizId: result.quiz_id,
            questionId: question.id,
            category,
          });
        }
      }
    }
  }

  const allIds = new Set([...missedIds, ...flaggedIds]);

  return {
    questionIds: Array.from(allIds),
    quizIds: Array.from(sourceQuizIds),
    missedCount: missedIds.size,
    flaggedCount: flaggedIds.size,
    totalUniqueCount: allIds.size,
  };
}
