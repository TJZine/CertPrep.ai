import { useState, useEffect, useMemo } from 'react';
import { hashAnswer } from '@/lib/utils';
import type { Question } from '@/types/quiz';

/**
 * Asynchronously resolves correct answer keys for a list of questions.
 * Returns a map of questionId -> correctKey.
 */
export function useResolveCorrectAnswers(questions: Question[]): { resolvedAnswers: Record<string, string>; isResolving: boolean } {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(true);

  // Create stable key for dependency comparison to prevent unnecessary re-runs
  const questionsKey = useMemo(
    () => questions.map(q => q.id + ':' + q.correct_answer_hash).join('|'),
    [questions]
  );

  useEffect((): (() => void) | void => {
    if (!questions.length) {
      setIsResolving(false);
      return;
    }

    let isMounted = true;
    setIsResolving(true);

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
          })
        );

        if (isMounted) {
          // Merge with previous state to avoid flashing empty
          setResolved(prev => ({ ...prev, ...updates }));
        }
      } catch (error) {
        console.error('Failed to resolve answers:', error);
      } finally {
        if (isMounted) {
          setIsResolving(false);
        }
      }
    };

    resolveAll();

    return () => {
      isMounted = false;
    };
  }, [questionsKey, questions]); // Depend on stable key

  return { resolvedAnswers: resolved, isResolving };
}
