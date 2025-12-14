"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, initializeDatabase } from "@/db";
import { NIL_UUID } from "@/lib/constants";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import type { QuizStats } from "@/db/quizzes";
import { getQuizStats, isSRSQuiz, sortQuizzesByNewest } from "@/db/quizzes";
import { hydrateAggregatedQuiz } from "@/db/aggregatedQuiz";

interface InitializationState {
  isInitialized: boolean;
  error: Error | null;
}

interface UseQuizzesResponse {
  quizzes: Quiz[];
  isLoading: boolean;
}

interface UseQuizResponse {
  quiz: Quiz | undefined;
  isLoading: boolean;
}

interface UseQuizWithStatsResponse {
  quiz: Quiz | undefined;
  stats: QuizStats | null;
  isLoading: boolean;
}

interface UseResultsResponse {
  results: Result[];
  isLoading: boolean;
}

interface UseResultResponse {
  result: Result | null | undefined;
  isLoading: boolean;
}

interface UseQuizResultsResponse {
  results: Result[];
  isLoading: boolean;
}

interface UseResultWithHydratedQuizResponse {
  result: Result | null | undefined;
  quiz: Quiz | undefined;
  isLoading: boolean;
  isHydrating: boolean;
}

/**
 * Initializes the database connection when mounted.
 */
export function useInitializeDatabase(): InitializationState {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    initializeDatabase()
      .then(() => {
        if (isMounted) {
          setIsInitialized(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to initialize database."),
          );
        }
      });

    return (): void => {
      isMounted = false;
    };
  }, []);

  return { isInitialized, error };
}

/**
 * Retrieves all quizzes (user-owned and public) with live updates.
 */
export function useQuizzes(userId: string | undefined): UseQuizzesResponse {
  const quizzes = useLiveQuery(async () => {
    if (!userId) return [];
    // Only query for the user's own quizzes.
    // NIL_UUID (orphaned/system data) should not be mixed into the personal library.
    const results = await db.quizzes
      .where("user_id")
      .equals(userId)
      .filter((quiz) => !quiz.deleted_at && !isSRSQuiz(quiz))
      .toArray();

    // Stable sort: Newest created first -> Alphabetical by title
    return sortQuizzesByNewest(results);
  }, [userId]);

  return {
    quizzes: quizzes ?? [],
    isLoading: !userId ? false : quizzes === undefined,
  };
}

/**
 * Retrieves a single quiz with live updates (user-owned or public).
 */
export function useQuiz(
  id: string | undefined,
  userId: string | undefined,
): UseQuizResponse {
  const quiz = useLiveQuery(async () => {
    if (!id || !userId) return undefined;
    const found = await db.quizzes.get(id);
    if (!found) return null;
    // Allow access if user owns it OR it is a public/system quiz
    // AND it is not deleted
    if (found.deleted_at) return null;
    return found.user_id === userId || found.user_id === NIL_UUID
      ? found
      : null;
  }, [id, userId]);
  return {
    quiz: id && userId && quiz ? quiz : undefined,
    isLoading: !id || !userId ? true : quiz === undefined,
  };
}

/**
 * Retrieves a quiz and its aggregated stats with live updates.
 */
export function useQuizWithStats(
  id: string | undefined,
  userId: string | undefined,
): UseQuizWithStatsResponse {
  const data = useLiveQuery(async () => {
    if (!id || !userId) {
      return { quiz: undefined, stats: null };
    }
    const quiz = await db.quizzes.get(id);
    if (!quiz || quiz.deleted_at) {
      return { quiz: undefined, stats: null };
    }
    // Allow access if user owns it OR it is a public/system quiz
    if (quiz.user_id !== userId && quiz.user_id !== NIL_UUID) {
      return { quiz: undefined, stats: null };
    }
    const stats = await getQuizStats(id, userId);
    return { quiz, stats };
  }, [id, userId]);

  return {
    quiz: id && userId ? data?.quiz : undefined,
    stats: data?.stats ?? null,
    isLoading: !id || !userId ? true : data === undefined,
  };
}

/**
 * Retrieves all results with live updates.
 */
export function useResults(userId: string | undefined): UseResultsResponse {
  const results = useLiveQuery(
    () =>
      userId
        ? db.results
          .where("user_id")
          .equals(userId)
          .filter((r) => !r.deleted_at)
          .sortBy("timestamp")
        : [],
    [userId],
  );
  return {
    results: results ? results.reverse() : [],
    isLoading: !userId ? true : results === undefined,
  };
}

/**
 * Retrieves a single result with live updates.
 */
export function useResult(
  id: string | undefined,
  userId: string | undefined,
): UseResultResponse {
  const result = useLiveQuery(async () => {
    if (!id || !userId) return undefined;
    const found = await db.results.get(id);
    if (!found || found.deleted_at) {
      return null;
    }
    return found.user_id === userId ? found : null;
  }, [id, userId]);
  return {
    result: id && userId ? result : undefined,
    isLoading: !id || !userId ? true : result === undefined,
  };
}

/**
 * Retrieves results for a specific quiz with live updates.
 */
export function useQuizResults(
  quizId: string | undefined,
  userId: string | undefined,
): UseQuizResultsResponse {
  const results = useLiveQuery(async () => {
    if (!quizId || !userId) {
      return [] as Result[];
    }
    const ordered = await db.results
      .where("[user_id+quiz_id]")
      .equals([userId, quizId])
      .filter((r) => !r.deleted_at)
      .sortBy("timestamp");
    return ordered.reverse();
  }, [quizId, userId]);

  return {
    results: results ?? [],
    isLoading: !quizId || !userId ? true : results === undefined,
  };
}

/**
 * Retrieves a result and its quiz, hydrating the quiz if it's an aggregated one (SRS/Topic Study).
 * This ensures that results for aggregated sessions have a fully populated "synthetic" quiz
 * with all the necessary questions for rendering the results UI.
 */
export function useResultWithHydratedQuiz(
  id: string | undefined,
  userId: string | undefined,
): UseResultWithHydratedQuizResponse {
  const { result, isLoading: resultLoading } = useResult(id, userId);
  const [hydratedQuiz, setHydratedQuiz] = useState<Quiz | undefined>(undefined);
  const [isHydrating, setIsHydrating] = useState(false);

  // We use live query for the base quiz to keep it reactive to title changes etc.
  const quizId = result?.quiz_id;
  const { quiz: baseQuiz, isLoading: baseQuizLoading } = useQuiz(
    quizId,
    userId,
  );

  useEffect(() => {
    let isMounted = true;

    const hydrate = async (): Promise<void> => {
      // Wait for all data to be ready
      if (!result || !baseQuiz || !userId) {
        if (isMounted) setHydratedQuiz(undefined);
        return;
      }

      // 1. Standard Quiz: It has questions, so just use it.
      // We check for questions length > 0 to differentiate from empty SRS quizzes.
      if (!isSRSQuiz(baseQuiz) && baseQuiz.questions.length > 0) {
        if (isMounted) {
          setHydratedQuiz(baseQuiz);
          setIsHydrating(false);
        }
        return;
      }

      // 2. Aggregated Quiz (SRS/Topic Study):
      // The base quiz is empty (questions: []). We must hydrate questions from IDs.
      if (result.question_ids && result.question_ids.length > 0) {
        if (isMounted) setIsHydrating(true);
        try {
          // Determine a display title for the synthetic quiz
          let title = baseQuiz.title;
          if (isSRSQuiz(baseQuiz) && result.category_breakdown) {
            const categories = Object.keys(result.category_breakdown);
            if (categories.length === 1) {
              title = `Topic Study: ${categories[0]}`;
            } else if (categories.length > 1) {
              title = "Study Session";
            }
          }

          const { syntheticQuiz } = await hydrateAggregatedQuiz(
            result.question_ids,
            userId,
            title,
          );

          if (isMounted) {
            setHydratedQuiz(syntheticQuiz);
          }
        } catch (err) {
          console.error("Failed to hydrate quiz", err);
          // Fallback to base quiz (empty) so UI can at least show something
          if (isMounted) {
            setHydratedQuiz(baseQuiz);
          }
        } finally {
          if (isMounted) {
            setIsHydrating(false);
          }
        }
      } else {
        // Fallback: base quiz is empty and we have no question_ids to hydrate from.
        if (isMounted) {
          setHydratedQuiz(baseQuiz);
          setIsHydrating(false);
        }
      }
    };

    void hydrate();

    return (): void => {
      isMounted = false;
    };
  }, [result, baseQuiz, userId]);

  const isLoading =
    resultLoading || (!!result?.quiz_id && baseQuizLoading) || isHydrating;

  return {
    result,
    quiz: hydratedQuiz,
    isLoading,
    isHydrating,
  };
}
