import { useState, useEffect, useMemo } from "react";
import { hashAnswer } from "@/lib/utils";
import type { Question } from "@/types/quiz";

/**
 * Asynchronously resolves correct answer keys for a list of questions.
 * Returns a map of questionId -> correctKey.
 */
export function useResolveCorrectAnswers(questions: Question[]): {
  resolvedAnswers: Record<string, string>;
  isResolving: boolean;
  error: Error | null;
} {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create stable key for dependency comparison to prevent unnecessary re-runs
  const questionsKey = useMemo(
    () => questions.map((q) => q.id + ":" + q.correct_answer_hash).join("|"),
    [questions],
  );

  useEffect((): (() => void) | void => {
    if (!questions.length) {
      setResolved({});
      setIsResolving(false);
      return;
    }

    let isMounted = true;
    setIsResolving(true);
    setError(null);

    const resolveAll = async (): Promise<void> => {
      try {
        // Calculate new resolutions
        const updates: Record<string, string> = {};

        await Promise.all(
          questions.map(async (q) => {
            const targetHash = q.correct_answer_hash;
            if (!targetHash) return;

            // Brute-force check options
            for (const key of Object.keys(q.options)) {
              const hash = await hashAnswer(key);
              if (hash === targetHash) {
                updates[q.id] = key;
                break;
              }
            }
          }),
        );

        if (isMounted) {
          // Overwrite previous state to ensure no stale keys remain
          setResolved(updates);
          setIsResolving(false);
        }
      } catch (err) {
        console.error("Failed to resolve answers:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to resolve answers"));
          setResolved({});
          setIsResolving(false);
        }
      }
    };

    resolveAll();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsKey]); // Depend on stable key only

  return { resolvedAnswers: resolved, isResolving, error };
}