import React, { useState, useEffect } from 'react';
import { hashAnswer } from '@/lib/utils';

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 */
export function useCorrectAnswer(
  questionId: string | null,
  targetHash: string | null,
  options?: Record<string, string>
): { resolvedAnswers: Record<string, string>; isResolving: boolean } {
  const [resolvedAnswers, setResolvedAnswers] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);
  const resolvedRef = React.useRef<Set<string>>(new Set());

  // Create a stable key for options to avoid unnecessary re-runs
  const optionsKey = options ? JSON.stringify(Object.keys(options).sort()) : '';

  useEffect(() => {
    let isMounted = true;

    const resolveAnswer = async (): Promise<void> => {
      if (!questionId || !targetHash || !options) return;
      
      // Check if already resolved using ref to avoid stale closure
      const resolvedKey = `${questionId}:${targetHash}`;
      if (resolvedRef.current.has(resolvedKey)) return;
      resolvedRef.current.add(resolvedKey);

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
        console.error('Failed to resolve answer:', err);
        // Remove from ref on error so we can retry if needed
        const resolvedKey = `${questionId}:${targetHash}`;
        resolvedRef.current.delete(resolvedKey);
        
        if (isMounted) {
          setResolvedAnswers((prev) => {
            const updated = { ...prev };
            delete updated[questionId];
            return updated;
          });
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, targetHash, optionsKey]);

  return { resolvedAnswers, isResolving };
}
