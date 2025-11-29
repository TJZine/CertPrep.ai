import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { createResult } from '@/db/results';
import { useSync } from '@/hooks/useSync';
import { useQuizSessionStore } from '@/stores/quizSessionStore';

interface UseQuizSubmissionProps {
  quizId: string;
  isSmartRound?: boolean;
}

interface UseQuizSubmissionReturn {
  saveError: boolean;
  isSaving: boolean;
  submitQuiz: (timeTakenSeconds: number) => Promise<void>;
  retrySave: (timeTakenSeconds: number) => void;
}

export function useQuizSubmission({ quizId, isSmartRound = false }: UseQuizSubmissionProps): UseQuizSubmissionReturn {
  const router = useRouter();
  const { addToast } = useToast();
  const { sync } = useSync();
  const { answers, flaggedQuestions } = useQuizSessionStore();

  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(false);
  const isSavingRef = useRef(false);

  useEffect((): (() => void) => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  const submitQuiz = useCallback(
    async (timeTakenSeconds: number): Promise<void> => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setIsSaving(true);
      setSaveError(false);

      try {
        const answersRecord: Record<string, string> = {};
        answers.forEach((record, questionId) => {
          answersRecord[questionId] = record.selectedAnswer;
        });

        const result = await createResult({
          quizId,
          mode: 'zen',
          answers: answersRecord,
          flaggedQuestions: Array.from(flaggedQuestions),
          timeTakenSeconds,
        });

        // Attempt background sync
        void sync();

        if (!isMountedRef.current) return;

        if (isSmartRound) {
          try {
            sessionStorage.removeItem('smartRoundQuestions');
            sessionStorage.removeItem('smartRoundQuizId');
            sessionStorage.removeItem('smartRoundAllQuestions');
            sessionStorage.removeItem('smartRoundMissedCount');
            sessionStorage.removeItem('smartRoundFlaggedCount');
          } catch (e) {
            console.warn('Failed to clear sessionStorage:', e);
          }
        }

        addToast('success', isSmartRound ? 'Smart Round complete!' : 'Study session complete!');
        router.push(`/results/${result.id}`);
      } catch (error) {
        console.error('Failed to save quiz result:', error);
        if (isMountedRef.current) {
          setSaveError(true);
          addToast('error', 'Failed to save result. Please try again.');
        }
        // The original code threw the error, but the diff removes it.
        // Keeping the throw for consistency with original behavior if not explicitly removed.
        // However, the instruction's catch block does not include `throw error;`
        // Following the instruction's catch block exactly.
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
          isSavingRef.current = false;
        }
      }
    },
    [addToast, answers, flaggedQuestions, isSmartRound, quizId, router, sync]
  );

  const retrySave = useCallback(
    (timeTakenSeconds: number) => {
      void submitQuiz(timeTakenSeconds);
    },
    [submitQuiz]
  );

  return {
    saveError,
    isSaving,
    submitQuiz,
    retrySave,
  };
}
