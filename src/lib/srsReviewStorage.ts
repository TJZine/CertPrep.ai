import { logger } from "@/lib/logger";

/** Storage key for the array of question IDs in an SRS review session */
export const SRS_REVIEW_QUESTIONS_KEY = "srsReviewQuestions";
/** Storage key for the quiz ID associated with the SRS review */
export const SRS_REVIEW_QUIZ_ID_KEY = "srsReviewQuizId";

export const SRS_REVIEW_STATE_KEYS = [
    SRS_REVIEW_QUESTIONS_KEY,
    SRS_REVIEW_QUIZ_ID_KEY,
] as const;

/**
 * Best-effort clear of SRS review sessionStorage keys.
 * Swallows storage exceptions (e.g., Safari private mode) to avoid crashing flows.
 */
export function clearSRSReviewState(): void {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    try {
        SRS_REVIEW_STATE_KEYS.forEach((key) => {
            window.sessionStorage.removeItem(key);
        });
    } catch (error) {
        logger.warn("Failed to clear SRS review state from sessionStorage", error);
    }
}
