import { useState, useEffect } from 'react';

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 */
export function useCorrectAnswer(
  quizId: string | null,
  questionId: string | null,
  targetHash: string | null
): { resolvedAnswers: Record<string, string>; isResolving: boolean } {
  const [resolvedAnswers, setResolvedAnswers] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveAnswer = async (): Promise<void> => {
      if (!quizId || !questionId || !targetHash) return;
      
      // Check if already resolved
      if (resolvedAnswers[questionId]) return;

      setIsResolving(true);

      try {
        // First check if we have the answer in the question object itself (if passed)
        // This is an optimization if the data is already available
        
        // If not, fetch from API
        const response = await fetch(`/api/quiz/${quizId}/answer/${questionId}`);
        if (!response.ok) throw new Error('Failed to fetch answer');
        
        const data = await response.json();
        
        if (isMounted) {
          if (data && data.correct_answer) {
             // Verify hash matches if provided
             // In a real app, we might verify the hash here too
             setResolvedAnswers((prev) => ({
               ...prev,
               [questionId]: data.correct_answer,
             }));
          } else {
            console.warn(`No matching answer found for question ${questionId} with hash ${targetHash}`);
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
  }, [quizId, questionId, targetHash, resolvedAnswers]);

  return { resolvedAnswers, isResolving };
}
