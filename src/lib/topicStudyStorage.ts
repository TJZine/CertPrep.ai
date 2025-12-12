import { logger } from "@/lib/logger";

/** Storage key for the array of question IDs in a Topic Study session */
export const TOPIC_STUDY_QUESTIONS_KEY = "topicStudyQuestions";
/** Storage key for the quiz ID associated with the Topic Study */
export const TOPIC_STUDY_QUIZ_ID_KEY = "topicStudyQuizId";
/** Storage key for the category being studied */
export const TOPIC_STUDY_CATEGORY_KEY = "topicStudyCategory";
/** Storage key for count of missed questions */
export const TOPIC_STUDY_MISSED_COUNT_KEY = "topicStudyMissedCount";
/** Storage key for count of flagged questions */
export const TOPIC_STUDY_FLAGGED_COUNT_KEY = "topicStudyFlaggedCount";

export const TOPIC_STUDY_STATE_KEYS = [
    TOPIC_STUDY_QUESTIONS_KEY,
    TOPIC_STUDY_QUIZ_ID_KEY,
    TOPIC_STUDY_CATEGORY_KEY,
    TOPIC_STUDY_MISSED_COUNT_KEY,
    TOPIC_STUDY_FLAGGED_COUNT_KEY,
] as const;

/**
 * Best-effort clear of Topic Study sessionStorage keys.
 * Swallows storage exceptions (e.g., Safari private mode) to avoid crashing flows.
 */
export function clearTopicStudyState(): void {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    try {
        TOPIC_STUDY_STATE_KEYS.forEach((key) => {
            window.sessionStorage.removeItem(key);
        });
    } catch (error) {
        logger.warn("Failed to clear Topic Study state from sessionStorage", error);
    }
}
