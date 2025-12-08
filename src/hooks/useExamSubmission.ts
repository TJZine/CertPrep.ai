import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useSync } from "@/hooks/useSync";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import { createResult } from "@/db/results";
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
    const { addToast } = useToast();
    const { sync } = useSync();
    const { submitExam, autoSubmitExam } = useQuizSessionStore();

    const [showSubmitModal, setShowSubmitModal] = React.useState(false);
    const [showTimeUpModal, setShowTimeUpModal] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [autoResultId, setAutoResultId] = React.useState<string | null>(null);
    const hasSavedResultRef = React.useRef(false);
    const isMountedRef = React.useRef(true);

    React.useEffect((): (() => void) => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Helper to convert Map to Record
    const buildAnswersRecord = React.useCallback((): Record<string, string> => {
        return Object.fromEntries(
            Array.from(answers.entries()).map(([id, record]) => [
                id,
                record.selectedAnswer,
            ]),
        );
    }, [answers]);

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
                answers: buildAnswersRecord(),
                flaggedQuestions: Array.from(flaggedQuestions),
                timeTakenSeconds: durationMinutes * 60 - timeRemaining,
            });
            hasSavedResultRef.current = true;
            const syncResult = await sync();
            if (!syncResult.success) {
                console.error("Failed to sync results after submit:", syncResult.error);
            }
            addToast("success", "Exam submitted successfully!");
            router.push(`/results/${result.id}`);
        } catch (error) {
            console.error("Failed to submit exam:", error);
            if (isMountedRef.current) {
                addToast("error", "Failed to submit exam. Please try again.");
            }
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
        }
    }, [
        addToast,
        buildAnswersRecord,
        durationMinutes,
        effectiveUserId,
        flaggedQuestions,
        isSubmitting,
        pauseTimer,
        quiz.id,
        router,
        submitExam,
        sync,
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
        setShowSubmitModal(false); // Valid guard: prevent overlapping modals
        pauseTimer();
        autoSubmitExam();
        try {
            const result = await createResult({
                quizId: quiz.id,
                userId: effectiveUserId,
                mode: "proctor",
                answers: buildAnswersRecord(),
                flaggedQuestions: Array.from(flaggedQuestions),
                timeTakenSeconds: durationMinutes * 60,
            });
            hasSavedResultRef.current = true;
            setAutoResultId(result.id);
            const syncResult = await sync();
            if (!syncResult.success) {
                console.error(
                    "Failed to sync results after auto-submit:",
                    syncResult.error,
                );
            }
            setShowTimeUpModal(true);
            return result.id;
        } catch (error) {
            console.error("Failed to auto-submit exam:", error);
            if (isMountedRef.current) {
                addToast("error", "Auto-submit failed. Please submit manually.");
                setShowSubmitModal(true);
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
        buildAnswersRecord,
        durationMinutes,
        effectiveUserId,
        flaggedQuestions,
        isSubmitting,
        pauseTimer,
        quiz.id,
        sync,
    ]);

    const handleTimeUpConfirm = React.useCallback(async (): Promise<void> => {
        try {
            const resultId = autoResultId;
            if (resultId) {
                setIsSubmitting(true);
                router.push(`/results/${resultId}`);
            } else {
                // Determine effective result ID *before* setting submitting state
                // to avoid blocking the fallback auto-submit call
                const finalResultId = await handleAutoSubmit();
                setIsSubmitting(true);
                if (finalResultId) {
                    router.push(`/results/${finalResultId}`);
                }
            }
        } catch (error) {
            console.error("Failed to save results:", error);
            if (isMountedRef.current) {
                addToast("error", "Failed to save results. Please try again.");
                setIsSubmitting(false);
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
