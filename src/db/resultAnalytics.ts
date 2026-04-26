import { db } from "./dbInstance";
import { getAllResults, getResultsByQuizId } from "./resultQueries";
import { calculatePercentage } from "@/lib/utils/math";
import { logger } from "@/lib/logger";
import { evaluateAnswer } from "@/lib/grading";
import { NIL_UUID } from "@/lib/constants";
import type { CategoryPerformance, Result } from "@/types/result";
import type { Question, Quiz } from "@/types/quiz";

export interface OverallStats {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  totalStudyTime: number;
  weakestCategories: Array<{ category: string; avgScore: number }>;
}

const WEAKEST_CATEGORY_PRIOR_TOTAL = 5;
const WEAKEST_CATEGORY_PRIOR_PERCENTAGE = 70;

type QuestionIndex = Map<string, { question: Question; quizId: string }>;
type CategoryScoreEntry = { category: string; correct: number; total: number };

function calculateWeakestCategoryRank(correct: number, total: number): number {
  const priorCorrect =
    (WEAKEST_CATEGORY_PRIOR_PERCENTAGE / 100) * WEAKEST_CATEGORY_PRIOR_TOTAL;
  return calculatePercentage(
    correct + priorCorrect,
    total + WEAKEST_CATEGORY_PRIOR_TOTAL,
  );
}

function buildQuestionIndex(
  quizzes: Array<Quiz | undefined | null>,
): QuestionIndex {
  const questionIndex: QuestionIndex = new Map();

  quizzes.forEach((quiz) => {
    if (!quiz || quiz.deleted_at != null || !quiz.questions) return;
    quiz.questions.forEach((question) => {
      questionIndex.set(question.id, { question, quizId: quiz.id });
    });
  });

  return questionIndex;
}

async function buildQuestionIndexWithSourceMap(
  quizzes: Quiz[],
  results: Result[],
): Promise<QuestionIndex> {
  const baseQuizIds = new Set(quizzes.map((quiz) => quiz.id));
  const sourceQuizIds = new Set<string>();

  results.forEach((result) => {
    Object.values(result.source_map ?? {}).forEach((quizId) => {
      if (quizId && !baseQuizIds.has(quizId)) {
        sourceQuizIds.add(quizId);
      }
    });
  });

  if (sourceQuizIds.size === 0) {
    return buildQuestionIndex(quizzes);
  }

  const sourceQuizzes = await db.quizzes.bulkGet(Array.from(sourceQuizIds));
  return buildQuestionIndex([...quizzes, ...sourceQuizzes]);
}

function resolveSessionQuestions(
  result: Result,
  quiz: Quiz | undefined,
  allQuestionsMap: QuestionIndex,
): Question[] {
  if (result.question_ids !== undefined) {
    const localById = new Map(
      quiz?.questions.map((question) => [question.id, question] as const) ?? [],
    );
    return result.question_ids
      .map((id) => localById.get(id) ?? allQuestionsMap.get(id)?.question)
      .filter((question): question is Question => !!question);
  }

  if (quiz && quiz.questions.length > 0) {
    return quiz.questions;
  }

  return [];
}

function getValidComputedCategoryScoreEntries(
  result: Result,
  resolvedQuestionCount: number,
): CategoryScoreEntry[] | null {
  if (!result.computed_category_scores) return null;

  const entries = Object.entries(result.computed_category_scores).map(
    ([category, scores]) => ({
      category,
      correct: scores.correct,
      total: scores.total,
    }),
  );

  const hasInvalidScore = entries.some(
    ({ correct, total }) =>
      !Number.isFinite(correct) ||
      !Number.isFinite(total) ||
      correct < 0 ||
      total < 0 ||
      correct > total,
  );
  if (hasInvalidScore) return null;

  const computedTotal = entries.reduce((sum, { total }) => sum + total, 0);
  return computedTotal === resolvedQuestionCount ? entries : null;
}

/**
 * Aggregates category performance across all attempts for a quiz.
 */
export async function getCategoryPerformance(
  quizId: string,
  userId: string,
): Promise<CategoryPerformance[]> {
  const quiz = await db.quizzes.get(quizId);

  if (
    !quiz ||
    quiz.deleted_at != null ||
    (quiz.user_id !== userId && quiz.user_id !== NIL_UUID)
  ) {
    throw new Error("Quiz not found.");
  }

  const results = await getResultsByQuizId(quizId, userId);
  const totals: Record<string, { correct: number; total: number }> = {};
  const allQuestionsMap = buildQuestionIndex([quiz]);

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
  const [quizzes, results] = await Promise.all([
    db.quizzes
      .where("user_id")
      .equals(userId)
      .filter((quiz) => quiz.deleted_at == null)
      .toArray(),
    db.results
      .where("user_id")
      .equals(userId)
      .filter((result) => result.deleted_at == null)
      .toArray(),
  ]);

  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const allQuestionsMap = await buildQuestionIndexWithSourceMap(quizzes, results);

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

        const computedScores = getValidComputedCategoryScoreEntries(
          result,
          sessionQuestions.length,
        );
        if (computedScores) {
          return computedScores;
        }

        return Promise.all(
          sessionQuestions.map(async (question) => {
            const userAnswer = result.answers[String(question.id)];
            const { category, isCorrect } = await evaluateAnswer(
              question,
              userAnswer,
            );
            return {
              category,
              correct: isCorrect ? 1 : 0,
              total: 1,
            };
          }),
        );
      }),
    );

    batchData.flat().forEach(({ category, correct, total }) => {
      if (!categoryTotals[category]) {
        categoryTotals[category] = { correct: 0, total: 0 };
      }

      categoryTotals[category].total += total;
      categoryTotals[category].correct += correct;
    });
  }

  const weakestCategories = Object.entries(categoryTotals)
    .map(([category, { correct, total }]) => {
      const avgScore = calculatePercentage(correct, total);
      return {
        category,
        avgScore,
        rankScore: calculateWeakestCategoryRank(correct, total),
      };
    })
    .sort((a, b) => a.rankScore - b.rankScore || a.avgScore - b.avgScore)
    .slice(0, 5);

  return {
    totalQuizzes,
    totalAttempts,
    averageScore,
    totalStudyTime,
    weakestCategories: weakestCategories.map(({ category, avgScore }) => ({
      category,
      avgScore,
    })),
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

  const allQuizzes = await db.quizzes
    .where("user_id")
    .equals(userId)
    .filter((quiz) => quiz.deleted_at == null)
    .toArray();

  const quizMap = new Map(allQuizzes.map((quiz) => [quiz.id, quiz]));
  const allQuestionsMap = await buildQuestionIndexWithSourceMap(
    allQuizzes,
    allResults,
  );

  const latestEntries = new Map<
    string,
    {
      question: Question;
      questionId: string;
      result: Result;
      quiz: Quiz | undefined;
      isFlagged: boolean;
      userAnswer: string | undefined;
      timestamp: number;
    }
  >();

  for (const result of allResults) {
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
      const questionId = String(question.id);
      const previous = latestEntries.get(questionId);
      if (previous && previous.timestamp >= result.timestamp) {
        continue;
      }

      latestEntries.set(questionId, {
        question,
        questionId,
        result,
        quiz,
        isFlagged: result.flagged_questions?.includes(questionId) ?? false,
        userAnswer: result.answers[questionId],
        timestamp: result.timestamp,
      });
    }
  }

  const processedEntries = await Promise.all(
    Array.from(latestEntries.values()).map(
      async ({ question, questionId, result, quiz, isFlagged, userAnswer }) => {
        try {
          const isMissed = userAnswer
            ? !(await evaluateAnswer(question, userAnswer)).isCorrect
            : false;

          return { questionId, result, quiz, isFlagged, isMissed };
        } catch (error) {
          logger.error("Failed to process topic study question", {
            error,
            quizId: result.quiz_id,
            questionId,
            category,
          });
          return null;
        }
      },
    ),
  );

  const missedIds = new Set<string>();
  const flaggedIds = new Set<string>();
  const sourceQuizIds = new Set<string>();

  processedEntries.forEach((entry) => {
    if (!entry) return;
    const { questionId, result, quiz, isFlagged, isMissed } = entry;

    if (isFlagged) {
      flaggedIds.add(questionId);
    }

    if (isMissed) {
      missedIds.add(questionId);
    }

    if (isFlagged || isMissed) {
      const sourceQuizId = result.source_map?.[questionId];
      const sourceInfo = allQuestionsMap.get(questionId);
      if (sourceQuizId) {
        sourceQuizIds.add(sourceQuizId);
      } else if (sourceInfo) {
        sourceQuizIds.add(sourceInfo.quizId);
      } else if (quiz) {
        sourceQuizIds.add(quiz.id);
      }
    }
  });

  const allIds = new Set([...missedIds, ...flaggedIds]);

  return {
    questionIds: Array.from(allIds),
    quizIds: Array.from(sourceQuizIds),
    missedCount: missedIds.size,
    flaggedCount: flaggedIds.size,
    totalUniqueCount: allIds.size,
  };
}
