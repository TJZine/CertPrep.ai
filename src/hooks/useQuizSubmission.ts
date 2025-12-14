import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { createResult } from "@/db/results";
import { initializeSRSForResult } from "@/db/srs";
import { db } from "@/db/index";
import { useSync } from "@/hooks/useSync";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { clearSmartRoundState } from "@/lib/smartRoundStorage";
import { logger } from "@/lib/logger";

interface UseQuizSubmissionProps {
  quizId: string;
  isSmartRound?: boolean;
}

export interface UseQuizSubmissionReturn {
  /** True if the last save attempt failed. */
  saveError: boolean;
  /** True while the submission is being processed. */
  isSaving: boolean;
  /**
   * Submits the quiz result to the local database and triggers a background sync.
   * Redirects to the results page on success.
   *
   * @param timeTakenSeconds - The total duration of the quiz session.
   */
  submitQuiz: (timeTakenSeconds: number) => Promise<void>;
  /**
   * Retries the submission logic (wrapper around submitQuiz).
   *
   * @param timeTakenSeconds - The total duration of the quiz session.
   */
  retrySave: (timeTakenSeconds: number) => void;
}

/**
 * Hook to handle quiz completion and result submission.
 * Manages local persistence, syncing, and navigation.
 *
 * @param props - Configuration props (quizId, smartRound flag).
 * @returns State flags and submission handlers.
 */
export function useQuizSubmission({
  quizId,
  isSmartRound = false,
}: UseQuizSubmissionProps): UseQuizSubmissionReturn {
  const router = useRouter();
  const { addToast } = useToast();
  const { sync } = useSync();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { answers, flaggedQuestions, questions } = useQuizSessionStore();

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

        if (!effectiveUserId) {
          setSaveError(true);
          addToast(
            "error",
            "Unable to save result: no user context available.",
          );
          return;
        }

        const result = await createResult({
          quizId,
          userId: effectiveUserId,
          mode: "zen",
          answers: answersRecord,
          flaggedQuestions: Array.from(flaggedQuestions),
          timeTakenSeconds,
          activeQuestionIds: questions.map((q) => q.id), // Pass active questions for accurate scoring (e.g. Smart Round)
        });

        // Initialize SRS state for answered questions (non-blocking)
        const quiz = await db.quizzes.get(quizId);
        if (quiz) {
          void initializeSRSForResult(result, quiz).catch((srsErr) => {
            logger.warn("Failed to initialize SRS state (background)", { error: srsErr });
          });
        }

        // Fire-and-forget background sync - failures shouldn't invalidate the local save.
        void sync().catch((syncErr) => {
          console.warn("Background sync failed after local save:", syncErr);
        });


        if (!isMountedRef.current) return;

        if (isSmartRound) {
          clearSmartRoundState();
        }

        addToast(
          "success",
          isSmartRound ? "Smart Round complete!" : "Study session complete!",
        );
        router.push(`/results/${result.id}`);
      } catch (error) {
        console.error("Failed to save quiz result:", error);
        if (isMountedRef.current) {
          setSaveError(true);
          addToast("error", "Failed to save result. Please try again.");
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
          isSavingRef.current = false;
        }
      }
    },
    [
      addToast,
      answers,
      flaggedQuestions,
      isSmartRound,
      quizId,
      router,
      sync,
      questions,
      effectiveUserId,
    ],
  );

  const retrySave = useCallback(
    (timeTakenSeconds: number) => {
      void submitQuiz(timeTakenSeconds).catch(() => {
        // submitQuiz already updates saveError and shows a toast;
        // suppress the rejection to avoid unhandled promise errors.
      });
    },
    [submitQuiz],
  );

  return {
    saveError,
    isSaving,
    submitQuiz,
    retrySave,
  };
}
