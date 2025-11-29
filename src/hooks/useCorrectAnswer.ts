import { useState, useEffect } from 'react';
import { hashAnswer } from '@/lib/utils';

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 */
export function useCorrectAnswer(
  quizId: string | null,
  questionId: string | null,
  targetHash: string | null,
  options?: Record<string, string>
): { resolvedAnswers: Record<string, string>; isResolving: boolean } {
  const [resolvedAnswers, setResolvedAnswers] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveAnswer = async (): Promise<void> => {
      if (!questionId || !targetHash || !options) return;
      
      // Check if already resolved
      if (resolvedAnswers[questionId]) return;

      setIsResolving(true);

      try {
        // Brute-force check options
        for (const key of Object.keys(options)) {
          const hash = await hashAnswer(key);
          if (hash === targetHash) {
            if (isMounted) {
              setResolvedAnswers((prev) => ({
                ...prev,
                [questionId]: key,
              }));
            }
            break;
          }
        }
      } catch (err) {
        console.error('Failed to resolve answer:', err);
      } finally {
        if (isMounted) {
          setIsResolving(false);
        }
      }
    };

    resolveAnswer();

    return (): void => {
      isMounted = false;
    };
    // Removed resolvedAnswers from dependency array to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, targetHash, options]);

  return { resolvedAnswers, isResolving };
}
