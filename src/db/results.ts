import { db } from "./dbInstance";
import { isSRSQuiz } from "./srsQuiz";
import { NIL_UUID } from "@/lib/constants";
import { calculatePercentage } from "@/lib/utils/math";
import { generateUUID } from "@/lib/core/crypto";
import type { PersistedResultMode, Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";
import { evaluateAnswer } from "@/lib/grading";

export interface CreateResultInput {
  quizId: string;
  mode: PersistedResultMode;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
  activeQuestionIds?: string[];
  userId: string;
  /** Self-assessed difficulty ratings (Zen mode only) */
  difficultyRatings?: Record<string, 1 | 2 | 3>;
  /** Time spent per question in seconds */
  timePerQuestion?: Record<string, number>;
}

/**
 * Calculates overall and per-category performance for a completed quiz.
 * Also returns raw category scores for pre-computed analytics storage.
 */
export async function calculateResults(
  quiz: Quiz,
  answers: Record<string, string>,
  activeQuestionIds?: string[],
): Promise<{
  score: number;
  categoryBreakdown: Record<string, number>;
  categoryScores: Record<string, { correct: number; total: number }>;
}> {
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

  return { score, categoryBreakdown, categoryScores: categoryTotals };
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

  const { score, categoryBreakdown, categoryScores } = await calculateResults(
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
    computed_category_scores: categoryScores, // Pre-computed for analytics
    difficulty_ratings: input.difficultyRatings,
    time_per_question: input.timePerQuestion,
    synced: 0,
  };

  await db.results.add(result);
  return result;
}

interface AggregatedResultValidationInput {
  userId: string;
  srsQuizId: string;
  context: "SRS review" | "topic study" | "interleaved";
}

/**
 * Shared validation logic for all aggregated result types.
 * Ensures the SRS quiz exists, belongs to the user, and is a valid container.
 */
async function validateAggregatedResultInput(
  input: AggregatedResultValidationInput,
): Promise<void> {
  if (!input.userId) {
    throw new Error("Cannot create result without a user context.");
  }

  if (!input.srsQuizId) {
    throw new Error(`srsQuizId is required for ${input.context} results.`);
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
}

export interface CreateSRSReviewResultInput {
  userId: string;
  /** The per-user SRS quiz ID (from ensureSRSQuizExists) */
  srsQuizId: string;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
  /** Question IDs that were part of this review session */
  questionIds: string[];
  /** Pre-calculated score (percentage) */
  score: number;
  /** Pre-calculated category breakdown (percentages) */
  categoryBreakdown: Record<string, number>;
  /** Pre-calculated raw category scores for analytics */
  categoryScores?: Record<string, { correct: number; total: number }>;
  /**
   * Maps questionId → sourceQuizId for question attribution.
   * Optional because older reviews might not have this map, but recommended for new ones.
   */
  sourceMap?: Record<string, string>;
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
  await validateAggregatedResultInput({
    userId: input.userId,
    srsQuizId: input.srsQuizId,
    context: "SRS review",
  });

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
    computed_category_scores: input.categoryScores, // Pre-computed for analytics
    session_type: "srs_review", // Explicit session classification for analytics
    source_map: input.sourceMap, // Question attribution
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
  /** Pre-calculated category breakdown (percentages) */
  categoryBreakdown: Record<string, number>;
  /** Pre-calculated raw category scores for analytics */
  categoryScores?: Record<string, { correct: number; total: number }>;
  /**
   * Maps questionId → sourceQuizId for question attribution.
   * Optional for flexibility, though highly recommended for traceability.
   */
  sourceMap?: Record<string, string>;
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
  await validateAggregatedResultInput({
    userId: input.userId,
    srsQuizId: input.srsQuizId,
    context: "topic study",
  });

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
    computed_category_scores: input.categoryScores, // Pre-computed for analytics
    session_type: "topic_study", // Explicit session classification for analytics
    source_map: input.sourceMap, // Question attribution
    synced: 0, // Will sync normally
  };

  await db.results.add(result);
  return result;
}

export interface CreateInterleavedResultInput {
  userId: string;
  /** The per-user SRS quiz ID (reused for FK compliance) */
  srsQuizId: string;
  answers: Record<string, string>;
  flaggedQuestions: string[];
  timeTakenSeconds: number;
  /** Question IDs that were part of this session */
  questionIds: string[];
  /** Maps questionId → sourceQuizId for attribution (Required for Interleaved) */
  sourceMap: Record<string, string>;
  /** Pre-calculated score (percentage) */
  score: number;
  /** Pre-calculated category breakdown (percentages) */
  categoryBreakdown: Record<string, number>;
  /** Pre-calculated raw category scores for analytics */
  categoryScores?: Record<string, { correct: number; total: number }>;
}

/**
 * Persists an Interleaved Practice result.
 *
 * Like Topic Study, interleaved sessions aggregate questions from
 * multiple quizzes. Uses the SRS quiz for FK compliance and stores
 * source_map for question attribution.
 */
export async function createInterleavedResult(
  input: CreateInterleavedResultInput,
): Promise<Result> {
  await validateAggregatedResultInput({
    userId: input.userId,
    srsQuizId: input.srsQuizId,
    context: "interleaved",
  });

  const result: Result = {
    id: generateUUID(),
    quiz_id: input.srsQuizId, // Uses per-user SRS quiz for FK compliance
    user_id: input.userId,
    timestamp: Date.now(),
    mode: "zen", // Interleaved practice uses zen mode
    score: input.score,
    time_taken_seconds: input.timeTakenSeconds,
    answers: input.answers,
    flagged_questions: input.flaggedQuestions,
    category_breakdown: input.categoryBreakdown,
    question_ids: input.questionIds,
    computed_category_scores: input.categoryScores,
    session_type: "interleaved", // Explicit session classification
    source_map: input.sourceMap, // Question attribution
    synced: 0,
  };

  await db.results.add(result);
  return result;
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


