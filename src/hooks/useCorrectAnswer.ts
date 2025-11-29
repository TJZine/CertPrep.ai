import { useState, useEffect } from 'react';
import { hashAnswer } from '@/lib/utils';
import type { Question } from '@/types/quiz';

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 */
export function useCorrectAnswer(question: Question | null): string | null {
  const [correctKey, setCorrectKey] = useState<string | null>(null);

  useEffect((): (() => void) | void => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorrectKey(null); // Reset immediately when question changes

    const findKey = async (): Promise<void> => {
      if (!question) {
        if (isMounted) setCorrectKey(null);
        return;
      }

      // Optimization: If we somehow still have the raw answer (e.g. during creation), use it.
      // But we assume we only have the hash.
      const targetHash = question.correct_answer_hash;
      if (!targetHash) return;

      // Brute-force check all options (A, B, C, D...)
      // This is fast for small number of options.
      for (const key of Object.keys(question.options)) {
        const hash = await hashAnswer(key);
        if (hash === targetHash) {
          if (isMounted) setCorrectKey(key);
          return;
        }
      }
    };

    findKey();

    return () => {
      isMounted = false;
    };
  }, [question]);

  return correctKey;
}
