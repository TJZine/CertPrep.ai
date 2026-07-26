import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useSync } from "@/hooks/useSync";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { createResult } from "@/db/results";
import { isResultCompletionError } from "@/db/resultErrors";
import { buildAnswersRecord } from "@/lib/quiz/quizRemix";
import type { Quiz } from "@/types/quiz";

interface UseExamSubmissionProps {
    quiz: Quiz;
    effectiveUserId: string | null;
    durationMinutes: number;
    timeRemaining: number;
    pauseTimer: () => void;
    answers: Map<string, { selectedAnswer: string }>;
    flaggedQuestions: Set<string>;
}

interface UseExamSubmissionReturn {
    isSubmitting: boolean;
    showSubmitModal: boolean;
    setShowSubmitModal: (show: boolean) => void;
    showTimeUpModal: boolean;
    /**
     * Manually triggered submission by the user (from modal).
     */
    handleSubmitExam: () => Promise<void>;
    /**
     * Auto-triggered submission when time runs out.
     * Returns the result ID if successful, or null.
     */
    handleAutoSubmit: () => Promise<string | null>;
    /**
     * Confirm handler for the Time Up modal.
     */
    handleTimeUpConfirm: () => Promise<void>;
}

function getPermanentSubmissionMessage(error: unknown): string | null {
    if (!isResultCompletionError(error)) return null;

    switch (error.code) {
        case "QUIZ_CHANGED":
            return "This quiz changed during the exam. Return to the dashboard and start a new attempt.";
        case "QUIZ_UNAVAILABLE":
            return "This quiz is no longer available. Return to the dashboard to continue.";
        case "QUIZ_OWNERSHIP_MISMATCH":
            return "This quiz is not available for the current account.";
        case "USER_CONTEXT_UNAVAILABLE":
            return "Your account context is no longer available.";
        case "DRAFT_OWNERSHIP_LOST":
            return "This exam can no longer be completed from the current session.";
    }
}

/**
 * Encapsulates the logic for submitting a Proctor exam, handling both
 * manual submission and auto-submission when time expires.
 */
export function useExamSubmission({
    quiz,
    effectiveUserId,
    durationMinutes,
    timeRemaining,
    pauseTimer,
    answers,
    flaggedQuestions,
}: UseExamSubmissionProps): UseExamSubmissionReturn {
    const router = useRouter();
    const { user } = useAuth();
    const { addToast } = useToast();
    const { sync } = useSync();
    const { submitExam, autoSubmitExam, keyMappings } = useQuizSessionStore();

    const [showSubmitModal, setShowSubmitModal] = React.useState(false);
    const [showTimeUpModal, setShowTimeUpModal] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [autoResultId, setAutoResultId] = React.useState<string | null>(null);
    const hasSavedResultRef = React.useRef(false);
    const isMountedRef = React.useRef(false);
    const authenticatedUserId = user?.id;

    const syncSavedResult = React.useCallback(
        (submissionType: "submit" | "auto-submit"): void => {
            if (
                !authenticatedUserId ||
                authenticatedUserId !== effectiveUserId
            ) {
                return;
            }

            void sync()
                .then((syncResult) => {
                    if (!syncResult.success) {
                        console.error(
                            `Failed to sync results after ${submissionType}:`,
                            syncResult.error,
                        );
                    }
                })
                .catch((syncErr) => {
                    console.warn(
                        `Background sync failed after exam ${submissionType}:`,
                        syncErr,
                    );
                });
        },
        [authenticatedUserId, effectiveUserId, sync],
    );

    React.useEffect((): (() => void) => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleSubmitExam = React.useCallback(async (): Promise<void> => {
        if (isSubmitting || hasSavedResultRef.current) return;
        setIsSubmitting(true);
        setShowSubmitModal(false);
        try {
            if (!effectiveUserId) {
                addToast("error", "Unable to save results: no user context available.");
                setIsSubmitting(false);
                return;
            }
            pauseTimer();
            submitExam();

            const result = await createResult({
                quizId: quiz.id,
                userId: effectiveUserId,
                mode: "proctor",
                answers: buildAnswersRecord(answers, keyMappings),
                flaggedQuestions: Array.from(flaggedQuestions),
                timeTakenSeconds: Math.max(0, durationMinutes * 60 - timeRemaining),
            });
            hasSavedResultRef.current = true;
            addToast("success", "Exam submitted successfully!");
            syncSavedResult("submit");
            router.push(`/results/${result.id}`);
        } catch (error) {
            console.error("Failed to submit exam:", error);
            if (isMountedRef.current) {
                const permanentMessage = getPermanentSubmissionMessage(error);
                addToast(
                    "error",
                    permanentMessage ?? "Failed to submit exam. Please try again.",
                );
                if (permanentMessage) {
                    router.push("/");
                }
            }
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
        }
    }, [
        addToast,
        answers,
        keyMappings,
        durationMinutes,
        effectiveUserId,
        flaggedQuestions,
        isSubmitting,
        pauseTimer,
        quiz.id,
        router,
        submitExam,
        syncSavedResult,
        timeRemaining,
    ]);

    const handleAutoSubmit = React.useCallback(async (): Promise<
        string | null
    > => {
        if (isSubmitting || hasSavedResultRef.current) {
            return autoResultId;
        }
        if (!effectiveUserId) {
            addToast("error", "Unable to save results: no user context available.");
            return null;
        }
        setIsSubmitting(true);
        setShowSubmitModal(false); // Close submit modal to prevent overlap with time-up modal
        pauseTimer();
        autoSubmitExam();
        try {
            const result = await createResult({
                quizId: quiz.id,
                userId: effectiveUserId,
                mode: "proctor",
                answers: buildAnswersRecord(answers, keyMappings),
                flaggedQuestions: Array.from(flaggedQuestions),
                timeTakenSeconds: durationMinutes * 60,
            });
            hasSavedResultRef.current = true;
            setAutoResultId(result.id);
            setShowTimeUpModal(true);
            syncSavedResult("auto-submit");
            return result.id;
        } catch (error) {
            console.error("Failed to auto-submit exam:", error);
            if (isMountedRef.current) {
                const permanentMessage = getPermanentSubmissionMessage(error);
                addToast(
                    "error",
                    permanentMessage ?? "Auto-submit failed. Please submit manually.",
                );
                if (permanentMessage) {
                    router.push("/");
                } else {
                    setShowSubmitModal(true);
                }
            }
            return null;
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
        }
    }, [
        addToast,
        autoResultId,
        autoSubmitExam,
        answers,
        keyMappings,
        durationMinutes,
        effectiveUserId,
        flaggedQuestions,
        isSubmitting,
        pauseTimer,
        quiz.id,
        router,
        syncSavedResult,
    ]);

    const handleTimeUpConfirm = React.useCallback(async (): Promise<void> => {
        try {
            const resultId = autoResultId;
            if (resultId) {
                setIsSubmitting(true);
                router.push(`/results/${resultId}`);
            } else {
                // Fallback: handleAutoSubmit manages its own isSubmitting state
                const finalResultId = await handleAutoSubmit();
                if (finalResultId) {
                    router.push(`/results/${finalResultId}`);
                } else {
                    // Inform user if fallback submission also failed
                    addToast("error", "Unable to save results. Please try again.");
                }
            }
        } catch (error) {
            console.error("Failed to save results:", error);
            if (isMountedRef.current) {
                addToast("error", "Failed to save results. Please try again.");
            }
        }
    }, [autoResultId, handleAutoSubmit, router, addToast]);

    return {
        isSubmitting,
        showSubmitModal,
        setShowSubmitModal,
        showTimeUpModal,
        handleSubmitExam,
        handleAutoSubmit,
        handleTimeUpConfirm,
    };
}
