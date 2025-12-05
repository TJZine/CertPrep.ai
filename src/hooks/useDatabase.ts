"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, initializeDatabase } from "@/db";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import type { QuizStats } from "@/db/quizzes";
import { getQuizStats } from "@/db/quizzes";

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
 * Retrieves all quizzes with live updates.
 */
export function useQuizzes(userId: string | undefined): UseQuizzesResponse {
  const quizzes = useLiveQuery(
    () =>
      userId
        ? db.quizzes.where("user_id").equals(userId).sortBy("created_at")
        : [],
    [userId],
  );
  return {
    quizzes: quizzes ? quizzes.reverse() : [],
    isLoading: !userId ? true : quizzes === undefined,
  };
}

/**
 * Retrieves a single quiz with live updates.
 */
export function useQuiz(
  id: string | undefined,
  userId: string | undefined,
): UseQuizResponse {
  const quiz = useLiveQuery(async () => {
    if (!id || !userId) return undefined;
    const found = await db.quizzes.get(id);
    if (!found) return null;
    return found.user_id === userId ? found : null;
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
    if (!quiz) {
      return { quiz: undefined, stats: null };
    }
    if (quiz.user_id !== userId) {
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
        ? db.results.where("user_id").equals(userId).sortBy("timestamp")
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
    if (!found) {
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
      .sortBy("timestamp");
    return ordered.reverse();
  }, [quizId, userId]);

  return {
    results: results ?? [],
    isLoading: !quizId || !userId ? true : results === undefined,
  };
}
