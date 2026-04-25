import { db } from "./dbInstance";
import type { Quiz, Question } from "@/types/quiz";
import { isAggregatedSessionType, type Result } from "@/types/result";
import { logger } from "@/lib/logger";
import { NIL_UUID } from "@/lib/constants";

export interface SyntheticQuizResult {
  syntheticQuiz: Quiz;
  sourceQuizByQuestionId: Map<string, Quiz>;
  sourceMap: Record<string, string>;
  missingQuestionIds: string[];
}

export interface AggregatedResultReadModel {
  quiz: Quiz;
  sourceMap: Record<string, string>;
}

export function getAggregatedResultTitle(
  result: Result,
  fallbackTitle: string,
): string {
  switch (result.session_type) {
    case "topic_study": {
      const categories = Object.keys(result.category_breakdown ?? {});
      if (categories.length === 1) {
        return `Topic Study: ${categories[0]}`;
      }
      return "Topic Study";
    }
    case "srs_review":
      return "SRS Review";
    case "interleaved":
      return "Interleaved Practice";
    default:
      return fallbackTitle;
  }
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
  // Include both user-owned quizzes and public/system quizzes because aggregated
  // sessions can contain questions from either source.
  const allQuizzesRaw = await db.quizzes
    .where("user_id")
    .anyOf([userId, NIL_UUID])
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
  const sourceMap: Record<string, string> = {};
  const missingQuestionIds: string[] = [];

  // Reconstruct the order from the result's question_ids
  for (const id of questionIds) {
    const found = questionMap.get(id);
    if (found) {
      orderedQuestions.push(found.question);
      sourceQuizByQuestionId.set(id, found.quiz);
      sourceMap[id] = found.quiz.id;
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
    sourceMap,
    missingQuestionIds,
  };
}

export async function resolveAggregatedResultReadModel(
  result: Result,
  userId: string,
  baseQuiz?: Quiz,
): Promise<AggregatedResultReadModel> {
  if (
    !isAggregatedSessionType(result.session_type) ||
    !result.question_ids ||
    result.question_ids.length === 0
  ) {
    return {
      quiz: baseQuiz as Quiz,
      sourceMap: result.source_map ?? {},
    };
  }

  const { syntheticQuiz, sourceMap } = await hydrateAggregatedQuiz(
    result.question_ids,
    userId,
    getAggregatedResultTitle(result, baseQuiz?.title ?? "Aggregated Study Session"),
  );

  return {
    quiz: syntheticQuiz,
    sourceMap: {
      ...sourceMap,
      ...(result.source_map ?? {}),
    },
  };
}
