import { useState, useEffect } from 'react';
import { hashAnswer } from '@/lib/utils';
import type { Question } from '@/types/quiz';

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 */
export function useCorrectAnswer(question: Question | null): string | null {
  const [correctKey, setCorrectKey] = useState<string | null>(null);

  const questionId = question?.id;
  const targetHash = question?.correct_answer_hash;

  useEffect((): (() => void) | void => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorrectKey(null);

    if (!questionId || !targetHash || !question?.options) {
      return;
    }

    const findKey = async (): Promise<void> => {
      try {
        // Parallelize hashing for performance (O(1) effective latency vs O(n))
        const options = Object.entries(question.options);
        
        const results = await Promise.all(
          options.map(async ([key]) => {
            const hash = await hashAnswer(key);
            return { key, hash };
          })
        );

        const match = results.find((r) => r.hash === targetHash);
        
        if (isMounted && match) {
          setCorrectKey(match.key);
        }
      } catch (error) {
        console.error('Failed to resolve correct answer:', error);
      }
    };

    findKey();

    return () => {
      isMounted = false;
    };
  }, [questionId, targetHash, question?.options]); // Stable primitives + options ref (usually stable enough)

  return correctKey;
}
