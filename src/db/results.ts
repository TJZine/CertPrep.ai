import { db } from "@/db";
import { isSRSQuiz } from "./quizzes";
import { NIL_UUID } from "@/lib/constants";
import { calculatePercentage, generateUUID } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { CategoryPerformance, Result } from "@/types/result";
import type { Quiz, Question, QuizMode } from "@/types/quiz";
import { evaluateAnswer } from "@/lib/grading";

// Re-export for backwards compatibility
export { isSRSQuiz };

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

export interface CreateSRSReviewResultInput {
  userId: string;
  /** The per-user SRS quiz ID (from getOrCreateSRSQuiz) */
  srsQuizId: string;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
  /** Question IDs that were part of this review session */
  questionIds: string[];
  /** Pre-calculated score (percentage) */
  score: number;
  /** Pre-calculated category breakdown */
  categoryBreakdown: Record<string, number>;
}

/**
 * Persists an SRS review result using the per-user SRS quiz.
 *
 * Unlike regular quiz results, SRS sessions aggregate questions from
 * multiple quizzes. The srsQuizId links to a real quiz entity, allowing
 * the result to sync to Supabase normally.
 */
export async function createSRSReviewResult(
  input: CreateSRSReviewResultInput,
): Promise<Result> {
  if (!input.userId) {
    throw new Error("Cannot create result without a user context.");
  }

  if (!input.srsQuizId) {
    throw new Error("srsQuizId is required for SRS review results.");
  }

  // Validate SRS quiz exists, is owned by user, and not soft-deleted
  const quiz = await db.quizzes.get(input.srsQuizId);
  if (!quiz || quiz.deleted_at) {
    throw new Error("SRS quiz not found.");
  }
  if (quiz.user_id !== input.userId) {
    throw new Error(
      "Security mismatch: SRS quiz does not belong to the current user.",
    );
  }

  if (!isSRSQuiz(quiz.id, input.userId)) {
    throw new Error("Invalid srsQuizId: quiz is not an SRS quiz.");
  }

  const result: Result = {
    id: generateUUID(),
    quiz_id: input.srsQuizId, // Uses per-user SRS quiz for FK compliance
    user_id: input.userId,
    timestamp: Date.now(),
    mode: "zen", // SRS reviews use zen mode
    score: input.score,
    time_taken_seconds: input.timeTakenSeconds,
    answers: input.answers,
    flagged_questions: input.flaggedQuestions,
    category_breakdown: input.categoryBreakdown,
    question_ids: input.questionIds,
    synced: 0, // Will sync normally now
  };

  await db.results.add(result);
  return result;
}

export interface CreateTopicStudyResultInput {
  userId: string;
  /** The per-user SRS quiz ID (reused for FK compliance) */
  srsQuizId: string;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
  /** Question IDs that were part of this study session */
  questionIds: string[];
  /** Pre-calculated score (percentage) */
  score: number;
  /** Pre-calculated category breakdown */
  categoryBreakdown: Record<string, number>;
}

/**
 * Persists a Topic Study result using the per-user SRS quiz.
 *
 * Like SRS reviews, topic study sessions aggregate questions from
 * multiple quizzes. We reuse the SRS quiz for FK compliance since
 * both share the same aggregation pattern.
 */
export async function createTopicStudyResult(
  input: CreateTopicStudyResultInput,
): Promise<Result> {
  if (!input.userId) {
    throw new Error("Cannot create result without a user context.");
  }

  if (!input.srsQuizId) {
    throw new Error("srsQuizId is required for topic study results.");
  }

  // Validate SRS quiz exists, is owned by user, and not soft-deleted
  const quiz = await db.quizzes.get(input.srsQuizId);
  if (!quiz || quiz.deleted_at) {
    throw new Error("SRS quiz not found.");
  }
  if (quiz.user_id !== input.userId) {
    throw new Error(
      "Security mismatch: SRS quiz does not belong to the current user.",
    );
  }

  if (!isSRSQuiz(quiz.id, input.userId)) {
    throw new Error("Invalid srsQuizId: quiz is not an SRS quiz.");
  }

  const result: Result = {
    id: generateUUID(),
    quiz_id: input.srsQuizId, // Uses per-user SRS quiz for FK compliance
    user_id: input.userId,
    timestamp: Date.now(),
    mode: "zen", // Topic study uses zen mode
    score: input.score,
    time_taken_seconds: input.timeTakenSeconds,
    answers: input.answers,
    flagged_questions: input.flaggedQuestions,
    category_breakdown: input.categoryBreakdown,
    question_ids: input.questionIds,
    synced: 0, // Will sync normally
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

  // Process results in batches to avoid unbounded concurrency (consistent with getOverallStats)
  const BATCH_SIZE = 50;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map(async (result) => {
        return Promise.all(
          quiz.questions.map(async (question) => {
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

  // Create a map of all questions for O(1) lookup during aggregation
  // This allows us to score "aggregated" results (Topic Study/SRS) where the
  // source quiz is empty, but the questions exist in other user quizzes.
  const allQuestionsMap = new Map<string, { question: Question; quizId: string }>();
  quizzes.forEach((q) => {
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

  // Process results in batches to avoid blocking the main thread with unbounded concurrency
  const BATCH_SIZE = 50;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map(async (result) => {
        let sessionQuestions: Question[] = [];
        const quiz = quizMap.get(result.quiz_id);

        if (quiz && quiz.questions.length > 0) {
          sessionQuestions = quiz.questions;
        }
        // Handle aggregated results (Topic Study / SRS)
        else if (result.question_ids && result.question_ids.length > 0) {
          sessionQuestions = result.question_ids
            .map(id => allQuestionsMap.get(id)?.question)
            .filter((q): q is Question => !!q);
        }

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
  /** Deduplicated question IDs (missed OR flagged) */
  questionIds: string[];
  /** Source quiz IDs (for navigation reference) */
  quizIds: string[];
  /** Count of questions answered incorrectly */
  missedCount: number;
  /** Count of questions flagged for review */
  flaggedCount: number;
  /** Total unique questions after deduplication */
  totalUniqueCount: number;
}

/**
 * Collects all missed and flagged questions for a specific category
 * across all of a user's quizzes.
 *
 * Used by the "Study This Topic" feature in Analytics.
 */
export async function getTopicStudyQuestions(
  userId: string,
  category: string,
): Promise<TopicStudyData> {
  const allResults = await getAllResults(userId);
  // getAllResults returns newest first.
  // We want to track the *latest* status of each question.

  // Fetch all user quizzes to resolve questions
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

  // Process results in batches to avoid blocking
  const BATCH_SIZE = 50;
  for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
    const batch = allResults.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (result) => {
        let sessionQuestions: Question[] = [];
        const quiz = quizMap.get(result.quiz_id);

        if (quiz && quiz.questions.length > 0) {
          // If we have question_ids (e.g. Smart Round), filter to them. 
          // Otherwise use all quiz questions.
          const idSet = result.question_ids ? new Set(result.question_ids) : null;
          sessionQuestions = idSet
            ? quiz.questions.filter(q => idSet.has(q.id))
            : quiz.questions;
        }
        else if (result.question_ids && result.question_ids.length > 0) {
          sessionQuestions = result.question_ids
            .map(id => allQuestionsMap.get(id)?.question)
            .filter((q): q is Question => !!q);
        }

        if (sessionQuestions.length === 0) return;

        // Filter for category if specified
        const categoryQuestions = sessionQuestions.filter((q) => {
          const qCategory = q.category || "Uncategorized";
          return qCategory === category;
        });

        for (const question of categoryQuestions) {
          try {
            // We only care about the latest attempt for a given question.
            if (processedQuestionIds.has(question.id)) {
              continue;
            }

            // Mark as processed so older results don't override
            processedQuestionIds.add(question.id);

            const isFlagged = result.flagged_questions.includes(question.id);
            const userAnswer = result.answers[question.id];
            let isMissed = false;

            if (userAnswer) {
              const { isCorrect } = await evaluateAnswer(question, userAnswer);
              isMissed = !isCorrect;
            }

            if (isFlagged) {
              flaggedIds.add(question.id);
            }

            if (isMissed) {
              missedIds.add(question.id);
            }

            if (isFlagged || isMissed) {
              // We need to know which quiz this question actually belongs to
              // for the "quizIds" return value (used for source linking).
              // If it was an aggregated result, we need the source quiz ID.
              const sourceInfo = allQuestionsMap.get(question.id);
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
      }),
    );
  }

  // Combine and deduplicate
  const allIds = new Set([...missedIds, ...flaggedIds]);

  return {
    questionIds: Array.from(allIds),
    quizIds: Array.from(sourceQuizIds),
    missedCount: missedIds.size,
    flaggedCount: flaggedIds.size,
    totalUniqueCount: allIds.size,
  };
}
