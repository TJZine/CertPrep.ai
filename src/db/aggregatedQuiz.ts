import { db } from "@/db";
import type { Quiz, Question } from "@/types/quiz";
import { logger } from "@/lib/logger";

export interface SyntheticQuizResult {
  syntheticQuiz: Quiz;
  sourceQuizByQuestionId: Map<string, Quiz>;
  missingQuestionIds: string[];
}

/**
 * Hydrates a synthetic quiz object from a list of question IDs.
 * Used for Topic Study and SRS Review results where the "source" quiz (SRS quiz)
 * has no questions of its own.
 *
 * @param questionIds - The list of question IDs to include in the synthetic quiz.
 * @param userId - The effective user ID (to scope quiz lookup).
 * @param title - Optional title for the synthetic quiz.
 * @returns A synthetic quiz object with the populated questions.
 */
export async function hydrateAggregatedQuiz(
  questionIds: string[],
  userId: string,
  title: string = "Aggregated Study Session"
): Promise<SyntheticQuizResult> {
  // Load all quizzes that might contain these questions.
  // We include user-owned quizzes and potentially system quizzes (NIL_UUID) if we supported them.
  // For now, we strictly look at user-owned quizzes as per current architecture.
  // OPTIMIZATION: Fetch via toArray() then filter in-memory to avoid Dexie filter chain brittleness
  const allQuizzesRaw = await db.quizzes
    .where("user_id")
    .equals(userId)
    .toArray();

  const allQuizzes = allQuizzesRaw.filter((q) => q.deleted_at == null);

  const questionMap = new Map<string, { question: Question; quiz: Quiz }>();
  const sourceQuizByQuestionId = new Map<string, Quiz>();
  const questionIdSet = new Set(questionIds);

  // Build a lookup map of all available questions
  for (const quiz of allQuizzes) {
    for (const question of quiz.questions) {
      // Optimization: Only index questions we are looking for
      if (questionIdSet.has(question.id)) {
        // If a question appears in multiple quizzes (rare but possible if duplicated),
        // we take the first one we find.
        if (!questionMap.has(question.id)) {
          questionMap.set(question.id, { question, quiz });
        }
      }
    }
  }

  const orderedQuestions: Question[] = [];
  const missingQuestionIds: string[] = [];

  // Reconstruct the order from the result's question_ids
  for (const id of questionIds) {
    const found = questionMap.get(id);
    if (found) {
      orderedQuestions.push(found.question);
      sourceQuizByQuestionId.set(id, found.quiz);
    } else {
      missingQuestionIds.push(id);
    }
  }

  if (missingQuestionIds.length > 0) {
    const sample = missingQuestionIds.slice(0, 20);
    logger.warn("Some questions could not be re-hydrated for aggregated result", {
      count: missingQuestionIds.length,
      sample,
      ...(sample.length < missingQuestionIds.length && { truncated: true }),
    });
    logger.debug("Full list of missing question IDs", { missingIds: missingQuestionIds });
  }

  const syntheticQuiz: Quiz = {
    id: `synthetic-${userId}-${Date.now()}`, // Unique per hydration, not saved to DB
    user_id: userId,
    title,
    description: "Dynamically aggregated session from multiple quizzes",
    questions: orderedQuestions,
    tags: ["aggregated", "system"],
    created_at: Date.now(),
    updated_at: Date.now(),
    version: 1,
    deleted_at: null,
    quiz_hash: null,
    last_synced_at: null,
    last_synced_version: null,
  };

  return {
    syntheticQuiz,
    sourceQuizByQuestionId,
    missingQuestionIds,
  };
}
