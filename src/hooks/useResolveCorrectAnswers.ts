import { useState, useEffect } from 'react';
import { hashAnswer } from '@/lib/utils';
import type { Question } from '@/types/quiz';

/**
 * Asynchronously resolves correct answer keys for a list of questions.
 * Returns a map of questionId -> correctKey.
 */
export function useResolveCorrectAnswers(questions: Question[]): Record<string, string> {
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect((): (() => void) | void => {
    if (!questions.length) return;

    let isMounted = true;
    const newResolved: Record<string, string> = {};

    const resolveAll = async (): Promise<void> => {
      await Promise.all(
        questions.map(async (q) => {
          const targetHash = q.correct_answer_hash;
          if (!targetHash) return;

          // Brute-force check options
          for (const key of Object.keys(q.options)) {
            const hash = await hashAnswer(key);
            if (hash === targetHash) {
              newResolved[q.id] = key;
              break;
            }
          }
        })
      );

      if (isMounted) {
        setResolved(newResolved);
      }
    };

    resolveAll();

    return () => {
      isMounted = false;
    };
  }, [questions]);

  return resolved;
}
