import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { createResult, finalizeStandardZenResult } from "@/db/results";
import {
  ResultCompletionError,
  isResultCompletionError,
  type ResultCompletionErrorCode,
} from "@/db/resultErrors";
import { initializeSRSForResult } from "@/db/srs";
import { db } from "@/db";
import { useSync } from "@/hooks/useSync";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { clearSmartRoundState } from "@/lib/storage/smartRoundStorage";
import { logger } from "@/lib/logger";
import { buildAnswersRecord } from "@/lib/quiz/quizRemix";

interface UseQuizSubmissionProps {
  quizId: string;
  isSmartRound?: boolean;
  standardZenDraftOwnerId?: string | null;
}

export interface UseQuizSubmissionReturn {
  /** The last submission failure, including whether retrying can succeed. */
  failure: QuizSubmissionFailure | null;
  /** True while the submission is being processed. */
  isSaving: boolean;
  /**
   * Submits the quiz result to the local database and triggers a background sync.
   * Redirects to the results page on success.
   *
   * @param timeTakenSeconds - The total duration of the quiz session.
   * @param answers - Current answers map.
   * @param flaggedQuestions - Current flagged questions set.
   */
  submitQuiz: (
    timeTakenSeconds: number,
    answers: Map<string, { selectedAnswer: string; isCorrect?: boolean }>,
    flaggedQuestions: Set<string>,
  ) => Promise<void>;
  /**
   * Retries the submission logic (wrapper around submitQuiz).
   *
   * @param timeTakenSeconds - The total duration of the quiz session.
   */
  retrySave: (timeTakenSeconds: number) => void;
}

export type QuizSubmissionFailure =
  | {
      kind: "transient";
      message: string;
      canRetry: true;
    }
  | {
      kind: "permanent";
      code: ResultCompletionErrorCode;
      message: string;
      canRetry: false;
    };

function toSubmissionFailure(error: unknown): QuizSubmissionFailure {
  if (isResultCompletionError(error)) {
    const messageByCode: Record<ResultCompletionErrorCode, string> = {
      USER_CONTEXT_UNAVAILABLE:
        "Your account context is no longer available. Return to the dashboard before starting another attempt.",
      QUIZ_UNAVAILABLE:
        "This quiz is no longer available. Return to the dashboard to continue.",
      QUIZ_OWNERSHIP_MISMATCH:
        "This quiz is not available for the current account. Return to the dashboard to continue.",
      QUIZ_CHANGED:
        "This quiz changed while you were studying. Return to the dashboard and start a new attempt.",
      DRAFT_OWNERSHIP_LOST:
        "Another tab now owns this saved quiz. Return to the dashboard to continue.",
    };
    return {
      kind: "permanent",
      code: error.code,
      message: messageByCode[error.code],
      canRetry: false,
    };
  }

  return {
    kind: "transient",
    message:
      "We couldn't save your result. Your answers are still here—retry when ready.",
    canRetry: true,
  };
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
  standardZenDraftOwnerId = null,
}: UseQuizSubmissionProps): UseQuizSubmissionReturn {
  const router = useRouter();
  const { addToast } = useToast();
  const { sync } = useSync();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { answers, flaggedQuestions, questions, keyMappings } =
    useQuizSessionStore();

  const [failure, setFailure] = useState<QuizSubmissionFailure | null>(null);
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
    async (
      timeTakenSeconds: number,
      currentAnswers: Map<
        string,
        { selectedAnswer: string; isCorrect?: boolean }
      >,
      currentFlaggedQuestions: Set<string>,
    ): Promise<void> => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setIsSaving(true);
      setFailure(null);

      try {
        const answersRecord = buildAnswersRecord(currentAnswers, keyMappings);

        if (!effectiveUserId) {
          throw new ResultCompletionError(
            "USER_CONTEXT_UNAVAILABLE",
            "Unable to save result: no user context available.",
          );
        }

        const resultInput = {
          quizId,
          userId: effectiveUserId,
          mode: "zen",
          answers: answersRecord,
          flaggedQuestions: Array.from(currentFlaggedQuestions),
          timeTakenSeconds,
          activeQuestionIds: questions.map((q) => q.id), // Pass active questions for accurate scoring (e.g. Smart Round)
        } as const;
        let result;
        if (standardZenDraftOwnerId) {
          try {
            result = await finalizeStandardZenResult({
              ...resultInput,
              draftWriterId: standardZenDraftOwnerId,
            });
          } catch (error) {
            if (
              !isResultCompletionError(error) ||
              error.code !== "DRAFT_OWNERSHIP_LOST"
            ) {
              throw error;
            }
            // Another tab owns (or completed) the saved draft. This in-memory
            // attempt is still valid, so append its result without touching
            // the newer writer's draft.
            result = await createResult(resultInput);
          }
        } else {
          result = await createResult(resultInput);
        }

        // Initialize SRS state for answered questions (non-blocking)
        const quiz = await db.quizzes.get(quizId);
        if (quiz) {
          void initializeSRSForResult(result, quiz).catch((srsErr) => {
            logger.warn("Failed to initialize SRS state (background)", {
              error: srsErr,
            });
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
          const nextFailure = toSubmissionFailure(error);
          setFailure(nextFailure);
          addToast("error", nextFailure.message);
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
      isSmartRound,
      quizId,
      router,
      sync,
      questions,
      effectiveUserId,
      keyMappings,
      standardZenDraftOwnerId,
    ],
  );

  const retrySave = useCallback(
    (timeTakenSeconds: number) => {
      if (!failure?.canRetry) return;
      // On retry, we use the current store state
      void submitQuiz(timeTakenSeconds, answers, flaggedQuestions).catch(() => {
        // submitQuiz already updates failure state and shows a toast;
        // suppress the rejection to avoid unhandled promise errors.
      });
    },
    [answers, failure, flaggedQuestions, submitQuiz],
  );

  return {
    failure,
    isSaving,
    submitQuiz,
    retrySave,
  };
}
